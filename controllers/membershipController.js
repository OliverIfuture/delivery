// controllers/membershipController.js
//
// NUEVO — cobro REAL y DOMICILIADO (suscripción recurrente) de la
// membresía de plataforma que un entrenador elige al registrarse (ver
// RegisterTrainerFlow.vue del frontend, paso 4/5). Va directo a la
// cuenta de Stripe de LA PLATAFORMA (keys.stripeAdminSecretKey, sin
// { stripeAccount } de Connect) — a diferencia de COBI, que cobra a
// nombre de cada entrenador con su propia cuenta conectada, aquí el
// dinero es ingreso nuestro, no del entrenador. Por eso no hay
// application_fee real (ese campo es exclusivo de cargos vía Connect) —
// se deja igual el mismo criterio de 9.5% (4.5% procesamiento Stripe +
// 5% comisión) ya usado en el resto de la plataforma, como metadata para
// que la contabilidad sea consistente en todos lados.
const keys = require('../config/keys.js');
const db = require('../config/config.js');
const MembershipPlan = require('../models/membershipPlan.js');
const stripe = require('stripe')(keys.stripeAdminSecretKey);

const PLATFORM_FEE_PERCENT = '9.5';

module.exports = {

    // PÚBLICO — se usa durante el registro, antes de que exista la cuenta.
    async getPublicPlans(req, res) {
        try {
            const plans = await MembershipPlan.findAll();
            return res.status(200).json({ success: true, data: plans });
        } catch (error) {
            console.log(`Error en membershipController.getPublicPlans: ${error}`);
            return res.status(501).json({ success: false, message: 'Error al obtener los planes', error: error.message });
        }
    },

    // Crea (la primera vez) el Product/Price real DEL PLAN en Stripe —
    // recurring: interval 'month' + interval_count = duration_in_months,
    // mismo patrón ya usado para los planes de COBI — y una suscripción
    // real (domiciliada) para la compañía que YA se acaba de crear (ver
    // flujo de registro: primero se crea la cuenta con el endpoint ya
    // existente, luego se cobra aquí).
    async createCheckout(req, res) {
        try {
            const id_company = req.user.mi_store;
            const { id_plan } = req.body;
            if (!id_company) {
                return res.status(403).json({ success: false, message: 'Tu cuenta no tiene una empresa asignada.' });
            }
            if (!id_plan) {
                return res.status(400).json({ success: false, message: 'Falta id_plan.' });
            }
            const plan = await MembershipPlan.findById(id_plan);
            if (!plan) {
                return res.status(404).json({ success: false, message: 'Plan no encontrado.' });
            }

            let stripePriceId = plan.stripe_price_id;
            if (!stripePriceId) {
                const product = await stripe.products.create({
                    name: plan.name,
                    description: `Membresía Trainer Partners — ${plan.name}`,
                    type: 'service'
                });
                const price = await stripe.prices.create({
                    product: product.id,
                    unit_amount: Math.round(Number(plan.price) * 100),
                    currency: 'mxn',
                    recurring: { interval: 'month', interval_count: plan.duration_in_months }
                });
                await MembershipPlan.saveStripeIds(plan.id, product.id, price.id);
                stripePriceId = price.id;
            }

            // Cliente real de Stripe para esta compañía — se reutiliza si
            // ya se había intentado antes (ej. un pago que no se terminó
            // de confirmar).
            const existing = await db.oneOrNone(`SELECT membership_stripe_customer_id FROM company WHERE id = $1`, [id_company]);
            let customerId = existing?.membership_stripe_customer_id || null;
            if (!customerId) {
                const customer = await stripe.customers.create({
                    email: req.user.email,
                    name: req.user.name,
                    metadata: { id_company: String(id_company) }
                });
                customerId = customer.id;
                await db.none(`UPDATE company SET membership_stripe_customer_id = $2 WHERE id = $1`, [id_company, customerId]);
            }

            const subscription = await stripe.subscriptions.create({
                customer: customerId,
                items: [{ price: stripePriceId }],
                payment_behavior: 'default_incomplete',
                payment_settings: { save_default_payment_method: 'on_subscription' },
                expand: ['latest_invoice.payment_intent'],
                metadata: {
                    type: 'membership_payment',
                    id_company: String(id_company),
                    id_plan: plan.id,
                    platform_fee_percent: PLATFORM_FEE_PERCENT
                }
            });

            const clientSecret = subscription.latest_invoice?.payment_intent?.client_secret;
            if (!clientSecret) {
                throw new Error('Stripe no devolvió un client_secret válido para la suscripción.');
            }

            await db.none(`UPDATE company SET membership_stripe_subscription_id = $2 WHERE id = $1`, [id_company, subscription.id]);

            return res.status(200).json({
                success: true,
                data: {
                    clientSecret,
                    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || ''
                }
            });
        } catch (error) {
            console.log(`Error en membershipController.createCheckout: ${error}`);
            return res.status(501).json({ success: false, message: 'Error al iniciar el cobro', error: error.message });
        }
    },

    // Verifica DE VERDAD con Stripe (nunca confía en lo que mande el
    // cliente) que la suscripción quedó activa, y activa la membresía
    // real — esto es lo que reemplaza el 'fundador' fijo que
    // createWithImageUserAndCompany deja por defecto al crear la cuenta.
    // membership_expires_at ahora refleja el corte real de facturación
    // de Stripe (current_period_end), no una fecha calculada aparte.
    async confirmPayment(req, res) {
        try {
            const id_company = req.user.mi_store;
            const { id_plan } = req.body;
            if (!id_company) {
                return res.status(403).json({ success: false, message: 'Tu cuenta no tiene una empresa asignada.' });
            }
            if (!id_plan) {
                return res.status(400).json({ success: false, message: 'Falta id_plan.' });
            }
            const plan = await MembershipPlan.findById(id_plan);
            if (!plan) {
                return res.status(404).json({ success: false, message: 'Plan no encontrado.' });
            }

            const companyRow = await db.oneOrNone(`SELECT membership_stripe_subscription_id FROM company WHERE id = $1`, [id_company]);
            if (!companyRow?.membership_stripe_subscription_id) {
                return res.status(400).json({ success: false, message: 'Todavía no hay una suscripción iniciada para esta cuenta.' });
            }

            const subscription = await stripe.subscriptions.retrieve(companyRow.membership_stripe_subscription_id, {
                expand: ['latest_invoice.payment_intent']
            });
            if (subscription.metadata?.id_company !== String(id_company) || subscription.metadata?.id_plan !== plan.id) {
                return res.status(400).json({ success: false, message: 'La suscripción no corresponde a esta compañía o plan.' });
            }
            const paymentIntentStatus = subscription.latest_invoice?.payment_intent?.status;
            const isConfirmed = subscription.status === 'active' || subscription.status === 'trialing' || paymentIntentStatus === 'succeeded';
            if (!isConfirmed) {
                return res.status(400).json({ success: false, message: 'El pago todavía no se ha completado.' });
            }

            const expiresAt = subscription.current_period_end
                ? new Date(subscription.current_period_end * 1000)
                : (() => { const d = new Date(); d.setMonth(d.getMonth() + plan.duration_in_months); return d; })();

            await db.none(`
                UPDATE company
                SET membership_plan = $2, membership_status = 'active', membership_expires_at = $3
                WHERE id = $1
            `, [id_company, plan.id, expiresAt]);

            return res.status(200).json({ success: true, message: 'Membresía activada.' });
        } catch (error) {
            console.log(`Error en membershipController.confirmPayment: ${error}`);
            return res.status(501).json({ success: false, message: 'Error al confirmar el pago', error: error.message });
        }
    }

};
