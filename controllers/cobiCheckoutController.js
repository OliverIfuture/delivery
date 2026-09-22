// controllers/cobiCheckoutController.js
//
// NUEVO — CRUD del diseño de la pasarela de pago COBI. Ver
// models/cobiCheckout.js para el porqué del JSON único por entrenador.
const CobiCheckout = require('../models/cobiCheckout.js');
const User = require('../models/user.js');
const SubscriptionPlan = require('../models/subscriptionPlan.js');
const ClientSubscription = require('../models/clientSubscription.js');
const Rol = require('../models/rol.js');
const keys = require('../config/keys.js');
const crypto = require('crypto');
const stripe = require('stripe')(keys.stripeAdminSecretKey);

// Misma comisión ya usada en el resto de la plataforma para cobros a
// cuentas conectadas de Stripe (ver el comentario de
// clientSubscriptionsController.js -> createPackagePaymentIntent,
// "9.5% cubre la comisión de Stripe + tu 5% de plataforma"): 4.5% para
// cubrir el costo de procesamiento de Stripe + 5% de comisión propia. Se
// retiene con application_fee_amount/application_fee_percent, que Stripe
// deposita automáticamente en la MISMA cuenta de plataforma que ya recibe
// esa comisión en el resto de la app — al entrenador le llega el resto,
// directo a su cuenta conectada (cobro "Direct charge": el Precio del
// plan ya vive en su cuenta — ver createConnect en
// subscriptionPlansController.js — así que el cobro también se hace ahí,
// en vez de mover el dinero después con transfer_data).
const PLATFORM_FEE_PERCENT = 9.5;

module.exports = {

    // Autenticado — el propio entrenador guarda su diseño desde el editor.
    async saveDesign(req, res) {
        try {
            const id_trainer = req.user.id;
            const { design } = req.body;
            if (!design) {
                return res.status(400).json({ success: false, message: 'Falta el diseño.' });
            }
            const result = await CobiCheckout.upsert(id_trainer, design);
            return res.status(200).json({ success: true, data: result });
        } catch (error) {
            console.log(`Error en cobiCheckoutController.saveDesign: ${error}`);
            return res.status(501).json({
                success: false,
                message: 'Error al guardar el diseño',
                error: error.message
            });
        }
    },

    // Autenticado — para que el editor cargue lo último guardado al abrir.
    async getMyDesign(req, res) {
        try {
            const id_trainer = req.user.id;
            const row = await CobiCheckout.getByTrainer(id_trainer);
            return res.status(200).json({ success: true, data: row ? row.design : null });
        } catch (error) {
            console.log(`Error en cobiCheckoutController.getMyDesign: ${error}`);
            return res.status(501).json({
                success: false,
                message: 'Error al obtener el diseño',
                error: error.message
            });
        }
    },

    // PÚBLICO, sin login — la página de pago que abre el cliente desde el
    // enlace del entrenador necesita leer esto sin estar autenticada.
    async getPublicDesign(req, res) {
        try {
            const id_trainer = req.params.id_trainer;
            const row = await CobiCheckout.getByTrainer(id_trainer);
            return res.status(200).json({ success: true, data: row ? row.design : null });
        } catch (error) {
            console.log(`Error en cobiCheckoutController.getPublicDesign: ${error}`);
            return res.status(501).json({
                success: false,
                message: 'Error al obtener el diseño',
                error: error.message
            });
        }
    },

    // PÚBLICO — planes reales del entrenador para mostrarlos en su página
    // de pago (trainerId = users.id, el mismo que ya usa el enlace /pago/:id).
    async getPublicPlans(req, res) {
        try {
            const id_trainer = req.params.id_trainer;
            const companyRow = await User.findTrainerCompanyId(id_trainer);
            if (!companyRow || !companyRow.mi_store) {
                return res.status(404).json({ success: false, message: 'Entrenador no encontrado.' });
            }
            const plans = await SubscriptionPlan.findPublicByCompany(companyRow.mi_store);
            return res.status(200).json({ success: true, data: plans });
        } catch (error) {
            console.log(`Error en cobiCheckoutController.getPublicPlans: ${error}`);
            return res.status(501).json({
                success: false,
                message: 'Error al obtener los planes',
                error: error.message
            });
        }
    },

    // PÚBLICO — el pago real de COBI. El visitante todavía no tiene cuenta
    // ni sesión, así que aquí se busca o se crea su usuario (por email) y
    // según el tipo de plan:
    //  - transfer: se crea la solicitud pendiente real (misma tabla y
    //    mismo estado que createManualRequest en
    //    clientSubscriptionsController.js) para que el entrenador la
    //    apruebe desde "Solicitudes pendientes" en COBI PAYMENTS.
    //  - tarjeta (recurrente o pago único): se cobra con Stripe Connect
    //    ("Direct charge" — mismo patrón que createConnect, todo dentro
    //    de la cuenta del entrenador vía { stripeAccount }). El resto de
    //    la reconciliación (crear la fila en client_subscriptions, marcar
    //    VIP, guardar el pago) la hace el webhook YA REAL de
    //    clientSubscriptionsController.js (stripeWebhook) — se manda el
    //    mismo metadata.type/campos que ese webhook ya sabe leer, así que
    //    no hace falta duplicar nada de esa lógica aquí.
    async createCheckout(req, res) {
        try {
            const { trainerId, planId, name, lastname, email, phone } = req.body;
            if (!trainerId || !planId || !name || !email) {
                return res.status(400).json({ success: false, message: 'Faltan datos obligatorios.' });
            }

            const companyRow = await User.findTrainerCompanyId(trainerId);
            if (!companyRow || !companyRow.mi_store) {
                return res.status(404).json({ success: false, message: 'Entrenador no encontrado.' });
            }
            const id_company = companyRow.mi_store;

            const plan = await SubscriptionPlan.findByIdForCheckout(planId);
            if (!plan || String(plan.id_company) !== String(id_company)) {
                return res.status(404).json({ success: false, message: 'El plan no existe o no pertenece a este entrenador.' });
            }

            // Buscar o crear el cliente (contraseña generada al azar — no
            // hace falta pedírsela para pagar; puede recuperarla después
            // desde la app si necesita entrar).
            //
            // OJO — findByEmail hace INNER JOIN con user_has_roles, así
            // que un usuario sin rol asignado es invisible para esa
            // consulta (verificado en vivo: sin este paso, una segunda
            // compra con el mismo correo intentaba crear el usuario de
            // nuevo y truena por email duplicado). Por eso, igual que
            // hace el registro público (registerWithOutImage), se le
            // asigna el rol por defecto (1 = Cliente) justo después de
            // crearlo.
            let user = await User.findByEmail(email);
            if (!user) {
                const randomPassword = crypto.randomBytes(12).toString('hex');
                const created = await User.create({
                    email,
                    name,
                    lastname: lastname || '',
                    phone: phone || '',
                    image: null,
                    password: randomPassword,
                    id_entrenador: id_company
                });
                await Rol.create(created.id, 1);
                user = { id: created.id, email };
            }

            // ---- Transferencia: sin Stripe, solicitud pendiente real ----
            if (plan.payment_type === 'transfer') {
                const existingPending = await ClientSubscription.findPendingByClient(user.id, planId);
                if (existingPending) {
                    return res.status(200).json({
                        success: true,
                        requiresPayment: false,
                        message: 'Ya tienes una solicitud pendiente para este plan — tu entrenador la revisará pronto.'
                    });
                }
                await ClientSubscription.createManual({
                    id_client: user.id,
                    id_company,
                    id_plan: planId,
                    duration_days: plan.durationInDays,
                    status: 'PENDING'
                });
                return res.status(200).json({
                    success: true,
                    requiresPayment: false,
                    message: 'Solicitud enviada. Tu entrenador confirmará tu pago por transferencia y activará tu plan.'
                });
            }

            // ---- Tarjeta: requiere Stripe Connect real y activo ----
            const company = await User.findCompanyById(id_company);
            if (!company || !company.stripeAccountId || !company.chargesEnabled) {
                return res.status(400).json({ success: false, message: 'Este entrenador todavía no puede recibir pagos con tarjeta.' });
            }
            if (!plan.stripe_price_id || plan.stripe_price_id === 'MANUAL') {
                return res.status(400).json({ success: false, message: 'Este plan no tiene un precio de Stripe válido.' });
            }

            const stripeOpts = { stripeAccount: company.stripeAccountId };

            let customer;
            const existingCustomers = await stripe.customers.list({ email, limit: 1 }, stripeOpts);
            if (existingCustomers.data.length > 0) {
                customer = existingCustomers.data[0];
            } else {
                customer = await stripe.customers.create({ email, name: `${name} ${lastname || ''}`.trim() }, stripeOpts);
            }

            if (plan.billing_mode === 'one_time') {
                const amountInCents = Math.round(Number(plan.price) * 100);
                const applicationFeeInCents = Math.round(amountInCents * (PLATFORM_FEE_PERCENT / 100));

                const paymentIntent = await stripe.paymentIntents.create({
                    amount: amountInCents,
                    currency: plan.currency || 'mxn',
                    customer: customer.id,
                    automatic_payment_methods: { enabled: true },
                    application_fee_amount: applicationFeeInCents,
                    metadata: {
                        type: 'client_subscription_payment',
                        id_client: String(user.id),
                        id_company: String(id_company),
                        id_plan: String(planId),
                        duration_days: String(plan.durationInDays)
                    }
                }, stripeOpts);

                return res.status(200).json({
                    success: true,
                    requiresPayment: true,
                    mode: 'payment',
                    clientSecret: paymentIntent.client_secret,
                    publishableKey: company.stripePublishableKey,
                    stripeAccountId: company.stripeAccountId
                });
            }

            // Recurrente (domiciliado) — el trial_period_days ya vive en
            // el Price (ver createConnect), así que no hace falta
            // mandarlo aparte aquí.
            const subscription = await stripe.subscriptions.create({
                customer: customer.id,
                items: [{ price: plan.stripe_price_id }],
                payment_behavior: 'default_incomplete',
                payment_settings: { save_default_payment_method: 'on_subscription' },
                expand: ['latest_invoice.payment_intent', 'pending_setup_intent'],
                application_fee_percent: PLATFORM_FEE_PERCENT,
                metadata: {
                    type: 'client_subscription_payment',
                    id_company: String(id_company),
                    id_plan: String(planId),
                    temp_email: email
                }
            }, stripeOpts);

            let clientSecret = '';
            if (subscription.pending_setup_intent) {
                clientSecret = subscription.pending_setup_intent.client_secret;
            } else if (subscription.latest_invoice && subscription.latest_invoice.payment_intent) {
                clientSecret = subscription.latest_invoice.payment_intent.client_secret;
            } else {
                throw new Error('Stripe no devolvió un client_secret válido para la suscripción.');
            }

            return res.status(200).json({
                success: true,
                requiresPayment: true,
                mode: 'subscription',
                clientSecret,
                publishableKey: company.stripePublishableKey,
                stripeAccountId: company.stripeAccountId
            });

        } catch (error) {
            console.log(`Error en cobiCheckoutController.createCheckout: ${error}`);
            return res.status(501).json({
                success: false,
                message: 'Error al procesar el pago',
                error: error.message
            });
        }
    }

};
