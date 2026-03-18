// (Asegúrate de que estos 'imports' estén al inicio)
const ClientSubscription = require('../models/clientSubscription.js');
const User = require('../models/user.js');

const Wallet = require('../models/wallet.js');
const Affiliate = require('../models/affiliate.js');
const keys = require('../config/keys.js');
const Gym = require('../models/gym.js'); // <-- Modelo clave para Gimnasios
const Pos = require('../models/pos.js'); // <-- Modelo clave para el Webhook

const endpointSecret = keys.stripeWebhookSecret;
const adminStripe = require('stripe')(keys.stripeAdminSecretKey);

module.exports = {

    /**
     * --- ¡FUNCIÓN MODIFICADA! ---
     * POST /api/subscriptions/create-extension-intent
     * * Esta función ahora maneja AMBOS casos:
     * 1. Si el cliente NO tiene membresía, usa el 'id_plan' del body (Nueva Compra).
     * 2. Si el cliente SÍ tiene membresía, ignora el 'id_plan' y usa los datos
     * de su membresía activa (Extensión).
     */
    // (Esta es la función 'createExtensionIntent' en tu backend)


    // Asegúrate de poner esta función dentro de tu module.exports = { ... }


    async getRetryPaymentLink(req, res) {
        try {
            const stripe_subscription_id = req.params.stripe_subscription_id;

            if (!stripe_subscription_id || stripe_subscription_id === 'null') {
                return res.status(400).json({ success: false, message: 'ID no válido' });
            }

            // Buscamos SOLO la última factura que esté "abierta" (open = no pagada/fallida)
            const invoices = await adminStripe.invoices.list({
                subscription: stripe_subscription_id,
                status: 'open',
                limit: 1,
            });

            if (invoices.data.length > 0) {
                // Encontramos la factura pendiente, devolvemos el link mágico de Stripe
                return res.status(200).json({
                    success: true,
                    url: invoices.data[0].hosted_invoice_url
                });
            } else {
                return res.status(404).json({
                    success: false,
                    message: 'No hay pagos pendientes para esta suscripción'
                });
            }

        } catch (error) {
            console.log(`Error obteniendo link de reintento: ${error}`);
            return res.status(501).json({ success: false, error: error.message });
        }
    },


    // Añade esta función dentro de module.exports = { ... }

    async upgradeSubscription(req, res) {
        try {
            const id_client = req.user.id;
            const { id_plan, id_company, new_stripe_price_id } = req.body;

            // 1. Validar Compañía (Para usar sus credenciales de Stripe)
            const User = require('../models/user.js');
            const company = await User.findCompanyById(id_company);
            if (!company || !company.stripeSecretKey) {
                return res.status(400).json({ success: false, message: 'El entrenador no tiene pagos configurados.' });
            }

            const stripeInstance = require('stripe')(company.stripeSecretKey);

            // 2. Obtener la suscripción actual de la Base de Datos
            const ClientSubscription = require('../models/clientSubscription.js');
            const activeSub = await ClientSubscription.findActiveByClient(id_client);

            if (!activeSub || !activeSub.stripe_subscription_id) {
                return res.status(400).json({ success: false, message: 'No tienes un plan activo para mejorar.' });
            }

            const stripeSubId = activeSub.stripe_subscription_id;

            // 3. Obtener la suscripción en Stripe para saber cuál es el "Item" actual
            const subscription = await stripeInstance.subscriptions.retrieve(stripeSubId);
            const currentItemId = subscription.items.data[0].id;

            // 4. ¡EL PRORRATEO (UPGRADE EN STRIPE)!
            const updatedSubscription = await stripeInstance.subscriptions.update(stripeSubId, {
                items: [{
                    id: currentItemId,
                    price: new_stripe_price_id, // El nuevo precio
                }],
                proration_behavior: 'always_invoice', // Crea factura y cobra la diferencia AHORA MISMO
                metadata: {
                    id_plan: id_plan // Inyectamos el nuevo ID del plan a la metadata para que el webhook lo sepa
                }
            });

            // Nota: No necesitamos actualizar la BD manualmente aquí, 
            // porque 'always_invoice' dispara el Webhook (invoice.paid) al instante y él actualizará la BD.

            return res.status(200).json({
                success: true,
                message: '¡Plan mejorado exitosamente! El prorrateo se ha aplicado.',
            });

        } catch (error) {
            console.log(`Error CRÍTICO en upgradeSubscription: ${error}`);
            return res.status(501).json({
                success: false,
                message: error.raw ? error.raw.message : 'Error al cambiar de plan',
            });
        }
    },

    async getPaymentHistory(req, res) {
        try {
            const stripe_subscription_id = req.params.stripe_subscription_id;

            if (!stripe_subscription_id || stripe_subscription_id === 'null') {
                return res.status(400).json({ success: false, message: 'ID de suscripción no válido' });
            }

            // 🔥 Usamos "adminStripe" que ya tienes declarado arriba 🔥
            const invoices = await adminStripe.invoices.list({
                subscription: stripe_subscription_id,
                limit: 15,
            });

            // Mapeamos los datos para mandarle a Flutter solo lo que necesita
            const historyData = invoices.data.map(invoice => {
                return {
                    id: invoice.id,
                    amount: invoice.amount_paid / 100,
                    currency: invoice.currency.toUpperCase(),
                    status: invoice.status,
                    date: new Date(invoice.created * 1000).toISOString(),
                    receipt_url: invoice.hosted_invoice_url
                };
            });

            return res.status(200).json({
                success: true,
                data: historyData,
                message: 'Historial obtenido correctamente'
            });

        } catch (error) {
            console.log(`Error obteniendo historial de Stripe: ${error}`);
            return res.status(501).json({
                success: false,
                message: 'Error al obtener el historial de pagos',
                error: error.message
            });
        }
    },

    async createSubscriptionIntent(req, res, next) {
        try {
            // Recibimos parámetros.
            const { id_plan, id_company, price_id, discount_percent } = req.body;
            const id_client = req.user.id;

            // 1. Validación de compañía y Stripe Keys
            const company = await User.findCompanyById(id_company);
            if (!company || !company.stripeSecretKey || !company.stripeAccountId) {
                return res.status(400).json({
                    success: false,
                    message: 'El entrenador no tiene pagos configurados.'
                });
            }

            if (!price_id || price_id === 'MANUAL') {
                return res.status(400).json({ success: false, message: 'El plan no tiene un ID de precio de Stripe válido.' });
            }

            const stripeInstance = require('stripe')(company.stripeSecretKey);

            // 2. Gestión del Cliente (Customer)
            let customer;
            const existingCustomers = await stripeInstance.customers.list({ email: req.user.email, limit: 1 });

            if (existingCustomers.data.length > 0) {
                customer = existingCustomers.data[0];
            } else {
                customer = await stripeInstance.customers.create({
                    email: req.user.email,
                    name: `${req.user.name} ${req.user.lastname}`,
                });
            }

            // --- 3. LÓGICA DE SUSCRIPCIONES Y CUPONES DINÁMICOS ---
            let subscriptionParams = {
                customer: customer.id,
                items: [{ price: price_id }], // Usamos el ID del precio mensual creado en Stripe
                payment_behavior: 'default_incomplete',
                payment_settings: { save_default_payment_method: 'on_subscription' },
                expand: ['latest_invoice.payment_intent', 'pending_setup_intent'],

                // Configuración para transferir dinero al entrenador (Connect)
                transfer_data: {
                    destination: company.stripeAccountId,
                },

                // Metadata para tu Webhook
                metadata: {
                    type: 'client_subscription',
                    id_client: id_client,
                    id_company: id_company,
                    id_plan: id_plan
                }
            };

            // 🔥 Si hay descuento, creamos un cupón temporal en Stripe 🔥
            if (discount_percent && !isNaN(parseFloat(discount_percent)) && parseFloat(discount_percent) > 0) {
                const discountValue = parseFloat(discount_percent);

                // Creamos un cupón en Stripe de un solo uso (para el primer mes)
                const coupon = await stripeInstance.coupons.create({
                    percent_off: discountValue,
                    duration: 'once', // Cámbialo a 'forever' si quieres que el descuento aplique todos los meses
                    name: `Descuento ${discountValue}% App`,
                });

                subscriptionParams.coupon = coupon.id;
                subscriptionParams.metadata.discount_applied = 'YES';
                subscriptionParams.metadata.discount_percent = discountValue.toString();
                console.log(`Cupón de Stripe creado y aplicado: ${coupon.id} (${discountValue}%)`);
            } else {
                subscriptionParams.metadata.discount_applied = 'NO';
            }

            // --- 4. CREAR LA SUSCRIPCIÓN EN STRIPE ---
            const subscription = await stripeInstance.subscriptions.create(subscriptionParams);

            // --- 5. EXTRAER EL SECRETO CORRECTO ---
            // Si el cupón es del 100%, Stripe devuelve un SetupIntent (seti_). 
            // Si hay que cobrar, devuelve un PaymentIntent (pi_).
            let clientSecretStr = '';

            if (subscription.pending_setup_intent) {
                clientSecretStr = subscription.pending_setup_intent.client_secret;
                console.log("Generado SetupIntent para suscripción (Cobro $0 o Trial)");
            } else if (subscription.latest_invoice && subscription.latest_invoice.payment_intent) {
                clientSecretStr = subscription.latest_invoice.payment_intent.client_secret;
                console.log("Generado PaymentIntent para suscripción");
            } else {
                throw new Error("Stripe no devolvió un client_secret válido para la suscripción.");
            }

            // Retornamos los datos a Flutter
            return res.status(200).json({
                success: true,
                subscriptionId: subscription.id,
                clientSecret: clientSecretStr, // Esto es lo que lee tu app en Flutter
                customerId: customer.id,
                publishableKey: company.stripePublishableKey
            });

        } catch (error) {
            console.log(`Error CRÍTICO en createSubscriptionIntent: ${error}`);
            return res.status(501).json({
                success: false,
                message: 'Error al procesar la suscripción en Stripe',
                error: error.message
            });
        }
    },
    async createSubscriptionIntentAutom(req, res, next) {
        try {
            // Recibimos parámetros. 'discount_percent' puede venir null o undefined.
            const { id_plan, id_company, price_id, discount_percent } = req.body;
            const id_client = req.user.id;

            // 1. Validación de compañía y Stripe Keys
            const company = await User.findCompanyById(id_company);
            if (!company || !company.stripeSecretKey || !company.stripeAccountId) {
                return res.status(400).json({
                    success: false,
                    message: 'El entrenador no tiene pagos configurados.'
                });
            }

            const stripeInstance = require('stripe')(company.stripeSecretKey);

            // 2. Gestión del Cliente (Customer)
            let customer;
            const existingCustomers = await stripeInstance.customers.list({ email: req.user.email, limit: 1 });

            if (existingCustomers.data.length > 0) {
                customer = existingCustomers.data[0];
            } else {
                customer = await stripeInstance.customers.create({
                    email: req.user.email,
                    name: `${req.user.name} ${req.user.lastname}`,
                });
            }

            // --- 3. LÓGICA DE CUPÓN SEGURA (VALIDACIÓN AGREGADA) ---
            let couponId = null;

            // VALIDACIÓN: Solo entramos si existe Y si al convertir a número es mayor a 0
            if (discount_percent && !isNaN(parseFloat(discount_percent)) && parseFloat(discount_percent) > 0) {
                try {
                    console.log(`Intentando aplicar descuento del ${discount_percent}%...`);

                    // Crear cupón en Stripe
                    const coupon = await stripeInstance.coupons.create({
                        percent_off: parseFloat(discount_percent),
                        duration: 'forever',
                        name: `Descuento Especial ${discount_percent}%`,
                        metadata: { created_by: 'App_Promo' }
                    });

                    couponId = coupon.id; // Guardamos el ID si todo salió bien
                    console.log(`✅ Cupón creado: ${couponId}`);

                } catch (e) {
                    // SAFETY CATCH: Si Stripe falla al crear el cupón, NO detenemos la venta.
                    // Simplemente logueamos el error y seguimos (se cobrará precio full).
                    console.error("⚠️ Error creando cupón (se cobrará precio normal):", e.message);
                    couponId = null;
                }
            }
            // ----------------------------------------

            // 4. Configuración de la Suscripción
            const subscriptionConfig = {
                customer: customer.id,
                items: [{ price: stripe_price_id }],
                transfer_data: { destination: company.stripeAccountId },
                payment_behavior: 'default_incomplete',
                expand: ['latest_invoice.payment_intent'],

                // 1. METADATA PARA LA SUSCRIPCIÓN (Y LA FACTURA)
                metadata: {
                    type: 'client_subscription_payment',
                    id_company: id_company,
                    id_plan: id_plan,
                    duration_days: duration_days || 30,
                    temp_email: customer_email.toLowerCase()
                },

                // 2. FORZAR METADATA AL PAYMENT INTENT INTERNO (Para tu paz mental) 👇
                payment_settings: {
                    save_default_payment_method: 'on_subscription',
                    payment_method_options: {
                        card: {
                            mandate_options: { amount_type: 'fixed' }
                        }
                    }
                }
            };

            // Stripe permite actualizar el PaymentIntent de la primera factura justo después de crearlo
            const subscription = await stripe.subscriptions.create(subscriptionConfig);

            // Inyectamos la metadata manualmente al PaymentIntent generado para que aparezca en el Webhook
            if (subscription.latest_invoice && subscription.latest_invoice.payment_intent) {
                await stripe.paymentIntents.update(
                    subscription.latest_invoice.payment_intent.id,
                    { metadata: subscriptionConfig.metadata }
                );
            }
            return res.status(200).json({
                success: true,
                subscriptionId: subscription.id,
                clientSecret: subscription.latest_invoice.payment_intent.client_secret,
                customerId: customer.id,
                publishableKey: company.stripePublishableKey
            });

        } catch (error) {
            console.log(`Error CRÍTICO en createSubscriptionIntent: ${error}`);
            return res.status(501).json({
                success: false,
                message: 'Error al procesar la suscripción',
                error: error.message
            });
        }
    },
    /**
         * 👑 WEBHOOK MAESTRO DE STRIPE
         * Maneja Suscripciones, Planes Únicos, Gym, Wallet y Afiliados
         */
    /**
        * 👑 WEBHOOK MAESTRO DE STRIPE
        * Maneja Suscripciones, Planes Únicos, Gym, Wallet y Afiliados
        */
    /**
      * 👑 WEBHOOK MAESTRO DE STRIPE
      * Maneja Suscripciones, Upgrades, Planes Únicos, Gym, Wallet y Afiliados
      */
    async stripeWebhook(req, res, next) {
        const sig = req.headers['stripe-signature'];
        let event;

        try {
            if (!keys.stripeAdminSecretKey || !endpointSecret) {
                console.log('❌ Error en Webhook: Faltan claves (stripeAdminSecretKey o stripeWebhookSecret).');
                return res.status(500).send('Error de configuración.');
            }
            event = adminStripe.webhooks.constructEvent(req.rawBody, sig, endpointSecret);
        } catch (err) {
            console.log(`❌ Error en Webhook (constructEvent): ${err.message}`);
            return res.status(400).send(`Webhook Error: ${err.message}`);
        }

        switch (event.type) {

            // =================================================================
            // 1. SUSCRIPCIONES RECURRENTES (Primer pago, renovaciones y UPGRADES)
            // =================================================================
            case 'invoice.payment_succeeded':
            case 'invoice.paid':
                const invoice = event.data.object;
                let subMeta = invoice.metadata || {};

                // Rescate de metadata: Si no viene directo en la factura, la buscamos en la suscripción
                if (!subMeta.type && invoice.subscription) {
                    try {
                        const fullSub = await adminStripe.subscriptions.retrieve(invoice.subscription);
                        subMeta = fullSub.metadata || {};
                    } catch (e) {
                        console.log(`⚠️ No se pudo recuperar metadata de la sub: ${invoice.subscription}`);
                    }
                }

                if (subMeta.type === 'client_subscription_payment') {
                    const { id_company, id_plan, temp_email } = subMeta;
                    const expirationDate = new Date(invoice.lines.data[0].period.end * 1000);

                    const User = require('../models/user.js');
                    const user = await User.findByEmail(temp_email);

                    // --- 🔥 MAGIA ANTI-DUPLICADOS Y UPGRADES 🔥 ---
                    // Verificamos si esta suscripción ya existe en la base de datos
                    const existingSub = await ClientSubscription.findByStripeId(invoice.subscription);

                    if (existingSub) {
                        // ES UN UPGRADE O UNA RENOVACIÓN AUTOMÁTICA
                        console.log(`🔄 Webhook: Actualizando suscripción existente (Upgrade/Renovación): ${invoice.subscription}`);

                        // Actualizamos el plan y la fecha (el id_plan viene fresco de la metadata actualizada)
                        await ClientSubscription.updatePlanAndDate(invoice.subscription, id_plan, expirationDate);

                        // Aseguramos que el estado esté activo (por si venía de past_due)
                        await ClientSubscription.updateStatus(invoice.subscription, 'active');

                    } else {
                        // ES UNA COMPRA NUEVA (PRIMER MES)
                        console.log(`✅ Webhook: Creando NUEVA suscripción: ${invoice.subscription}`);
                        const subscriptionData = {
                            id_client: user ? user.id : null,
                            id_company,
                            id_plan,
                            stripe_subscription_id: invoice.subscription,
                            stripe_customer_id: invoice.customer,
                            current_period_end: expirationDate,
                            temp_email: user ? null : temp_email
                        };
                        await ClientSubscription.create(subscriptionData);
                    }
                    // ------------------------------------------

                    if (user) {
                        await User.updateTrainer(user.id, id_company);
                        await User.transferClientData(user.id, id_company);

                        // 🔥 ACTUALIZACIÓN DE NIVEL VIP (RECURRENTE) 🔥
                        try {
                            const db = require('../config/config');
                            await db.none(`UPDATE users SET access_level = 2, updated_at = NOW() WHERE id = $1`, [user.id]);
                            console.log(`✅ Suscripción validada y nivel VIP (2) otorgado a: ${temp_email}`);
                        } catch (e) {
                            console.log(`❌ Error al dar VIP en suscripción recurrente: ${e.message}`);
                        }
                    } else {
                        console.log(`⏳ Suscripción guardada para usuario no registrado aún: ${temp_email}`);
                    }
                }
                break;

            // =================================================================
            // 2. PAGOS ÚNICOS (Entrenador, Gimnasio, Afiliados)
            // =================================================================
            case 'payment_intent.succeeded':
                const paymentIntent = event.data.object;
                const metadata = paymentIntent.metadata || {};

                if (!metadata.type) {
                    console.log(`🔔 Webhook PaymentIntent: Sin metadata. Ignorando.`);
                    break;
                }

                console.log(`🔔 Webhook PaymentIntent Succeeded: Tipo ${metadata.type}`);

                // A) Pago de Plan de Entrenamiento (Pago Único sin recurrencia)
                if (metadata.type === 'client_subscription_payment') {

                    // 👇 ¡EL ESCUDO PROTECTOR PARA EVITAR DUPLICADOS CON LAS SUSCRIPCIONES RECURRENTES! 👇
                    if (metadata.temp_email) {
                        console.log(`🔔 Webhook: PaymentIntent inicial de suscripción recurrente detectado. Delegando a invoice.paid...`);
                        break;
                    }

                    console.log('✅ Procesando pago único de Entrenador...');
                    const { id_client, id_company, id_plan, duration_days } = metadata;
                    const days = parseInt(duration_days) || 30;
                    const expirationDate = new Date();
                    expirationDate.setDate(expirationDate.getDate() + days);

                    try {
                        await ClientSubscription.create({
                            id_client, id_company, id_plan,
                            stripe_subscription_id: paymentIntent.id, // Guardamos PI como ID
                            stripe_customer_id: paymentIntent.customer,
                            status: 'active', current_period_end: expirationDate
                        });

                        if (id_client && id_company) {
                            const User = require('../models/user.js');
                            await User.updateTrainer(id_client, id_company);
                            await User.transferClientData(id_client, id_company);

                            // 🔥 ACTUALIZACIÓN DE NIVEL VIP (PAGO ÚNICO) 🔥
                            const db = require('../config/config');
                            await db.none(`UPDATE users SET access_level = 2, updated_at = NOW() WHERE id = $1`, [id_client]);
                        }
                        console.log(`✅ Pago único completado y nivel VIP (2) otorgado para ${id_client}`);
                    } catch (e) {
                        console.log(`❌ Error guardando pago único: ${e.message}`);
                    }
                }

                // B) Gimnasio (Membresías Físicas)
                else if (metadata.type === 'membership_extension' || metadata.type === 'gym_membership_payment') {
                    console.log('✅ Procesando pago de Gimnasio...');
                    const { id_client, id_membership_to_extend, id_plan, duration_days, duration_days_to_add } = metadata;
                    const daysToAdd = parseInt(duration_days || duration_days_to_add) || 30;

                    try {
                        const plan = await Gym.findById(id_plan);
                        let newEndDate = new Date();

                        if (id_membership_to_extend) {
                            const currentSub = await Gym.findMembershipById(id_membership_to_extend);
                            if (currentSub) {
                                const startDate = (new Date(currentSub.end_date) > new Date()) ? new Date(currentSub.end_date) : new Date();
                                newEndDate = new Date(startDate);
                                newEndDate.setDate(newEndDate.getDate() + daysToAdd);
                                await Gym.deactivateMembership(id_membership_to_extend, 'extended');
                            }
                        } else {
                            newEndDate.setDate(newEndDate.getDate() + daysToAdd);
                        }

                        const activeShift = await Pos.findActiveShiftByCompany(plan.id_company);
                        await Gym.createMembership({
                            id_client, id_company: plan.id_company, plan_name: plan.name,
                            price: plan.price, end_date: newEndDate, payment_method: 'STRIPE_APP',
                            payment_id: paymentIntent.id, id_shift: activeShift ? activeShift.id : null
                        });
                        console.log(`✅ Membresía Gym registrada para ${id_client}`);
                    } catch (e) {
                        console.log(`❌ Error procesando Gym Membership: ${e.message}`);
                    }
                }

                // C) Afiliados (Comisiones)
                else if (metadata.type === 'commission_payout') {
                    const { id_vendor, id_affiliate } = metadata;
                    try {
                        await Affiliate.markAsPaid(id_vendor, id_affiliate);
                        console.log(`✅ Comisiones marcadas como 'paid' para afiliado ${id_affiliate}`);
                    } catch (e) {
                        console.log(`❌ Error al procesar Payout de Comisión: ${e.message}`);
                    }
                }
                break;

            // =================================================================
            // 3. RECARGA DE BILLETERA (Premium Coins)
            // =================================================================
            case 'checkout.session.completed':
                const session = event.data.object;
                const metadataSession = session.metadata || {};

                if (metadataSession.type === 'wallet_topup') {
                    const { id_client, coins_to_add } = metadataSession;
                    try {
                        // Asegúrate de que el modelo Wallet esté importado arriba en tu archivo
                        await Wallet.processTopUp(id_client, parseFloat(coins_to_add), session.id);
                        console.log(`✅ ${coins_to_add} Premium Coins agregadas a ${id_client}.`);
                    } catch (error) {
                        console.log(`❌ Error en Wallet: ${error.message}`);
                    }
                }
                break;

            // =================================================================
            // 4. ESTADOS DE CUENTA Y CANCELACIONES (¡PIERDEN EL VIP!)
            // =================================================================
            case 'account.updated':
                console.log(`Webhook 'account.updated': ${event.data.object.id}`);
                break;

            case 'invoice.payment_failed':
                if (event.data.object.subscription) {
                    const failedSubId = event.data.object.subscription;
                    await ClientSubscription.updateStatus(failedSubId, 'past_due');

                    // 🔥 RETIRAR NIVEL VIP POR FALTA DE PAGO 🔥
                    try {
                        const db = require('../config/config');
                        await db.none(`
                            UPDATE users SET access_level = 1, updated_at = NOW()
                            WHERE id = (SELECT id_client FROM client_subscriptions WHERE stripe_subscription_id = $1 LIMIT 1)
                        `, [failedSubId]);
                        console.log(`🚫 Nivel VIP retirado por pago fallido (Sub ID: ${failedSubId})`);
                    } catch (e) {
                        console.log(`❌ Error retirando VIP en invoice.payment_failed: ${e.message}`);
                    }
                }
                break;

            case 'customer.subscription.deleted':
                const deletedSubId = event.data.object.id;
                await ClientSubscription.updateStatus(deletedSubId, 'canceled');

                // 🔥 RETIRAR NIVEL VIP POR CANCELACIÓN 🔥
                try {
                    const db = require('../config/config');
                    await db.none(`
                        UPDATE users SET access_level = 1, updated_at = NOW()
                        WHERE id = (SELECT id_client FROM client_subscriptions WHERE stripe_subscription_id = $1 LIMIT 1)
                    `, [deletedSubId]);
                    console.log(`🚫 Nivel VIP retirado por cancelación de suscripción (Sub ID: ${deletedSubId})`);
                } catch (e) {
                    console.log(`❌ Error retirando VIP en customer.subscription.deleted: ${e.message}`);
                }
                break;

            default:
                console.log(`Evento no manejado: ${event.type}`);
        }

        res.status(200).json({ received: true });
    },
    /**
     * WEBHOOK DE STRIPE
     * (Esta función maneja TODAS las confirmaciones de pago)
     */
    /**
async stripeWebhook12(req, res, next) {

    const sig = req.headers['stripe-signature'];
    let event;

    try {
        if (!keys.stripeAdminSecretKey || !endpointSecret) {
            console.log('❌ Error en Webhook: Faltan claves STRIPE_ADMIN_SECRET_KEY o STRIPE_WEBHOOK_SECRET.');
            return res.status(500).send('Error de configuración del webhook.');
        }
        event = adminStripe.webhooks.constructEvent(req.rawBody, sig, endpointSecret);

    } catch (err) {
        console.log(`❌ Error en Webhook (constructEvent): ${err.message}`);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Manejar el evento
    switch (event.type) {

        // --- Caso 1: Suscripción de Entrenador Creada/Pagada (client_subscriptions) ---
        case 'payment_intent.succeeded':
            const paymentIntent1 = event.data.object;
            const metadata1 = paymentIntent1.metadata;

            // --- A) PAGO DE ENTRENADOR (NUEVO FLUJO ÚNICO) ---
            if (metadata1.type === 'client_subscription_payment') {
                console.log('✅ Webhook: Pago Único de Entrenador Recibido.');

                const { id_client, id_company, id_plan, duration_days } = metadata1;
                console.log(`metadata1 de stripe: ${metadata1}`);

                // 1. Calcular Fecha de Vencimiento
                // (Como es pago único, nosotros calculamos el fin)
                const days = parseInt(duration_days) || 30; // Default 30 si falla
                const expirationDate = new Date();
                expirationDate.setDate(expirationDate.getDate() + days);

                // 2. Crear registro en BD
                // Reutilizamos el campo stripe_subscription_id para guardar el ID del pago
                const subscriptionData = {
                    id_client: id_client,
                    id_company: id_company,
                    id_plan: id_plan,
                    stripe_subscription_id: paymentIntent1.id, // Guardamos el PI en vez de Sub ID
                    stripe_customer_id: paymentIntent1.customer,
                    status: 'active', // Nace activa porque ya pagó
                    current_period_end: expirationDate
                };

                try {
                    await ClientSubscription.create(subscriptionData);
                    console.log(`✅ Suscripción (Pago Único) creada para cliente ${id_client} hasta ${expirationDate}`);

                    // 3. Vincular Entrenador
                    if (id_client && id_company) {
                        await User.updateTrainer(id_client, id_company);
                        await User.transferClientData(id_client, id_company);
                    }
                } catch (e) {
                    console.log(`❌ Error creando suscripción local: ${e.message}`);
                }
            }

            break;

        // --- Casos de Falla/Cancelación (client_subscriptions) ---
        case 'invoice.payment_failed':
            const subscriptionId_failed = event.data.object.subscription;
            await ClientSubscription.updateStatus(subscriptionId_failed, 'past_due');
            console.log('⚠️ Webhook: Pago fallido para suscripción:', subscriptionId_failed);
            break;
        case 'customer.subscription.deleted':
            const canceledSubId = event.data.object.id;
            await ClientSubscription.updateStatus(canceledSubId, 'canceled');
            console.log('❌ Webhook: Suscripción cancelada:', canceledSubId);
            break;

        // --- Caso 2: Onboarding de Entrenador (Stripe Connect) ---
        case 'account.updated':
            const account = event.data.object;
            const accountId = account.id;
            const chargesEnabled = account.charges_enabled;
            console.log(`Webhook 'account.updated': ${accountId}, charges_enabled: ${chargesEnabled}`);
            break;

        // --- Caso 3: Pago de Comisión O Extensión de Membresía ---
        case 'payment_intent.succeeded':
            const paymentIntent = event.data.object;
            const metadata = paymentIntent.metadata;

            // **Flujo A: Es un pago de comisión de Afiliado**
            if (metadata.type === 'commission_payout') {
                console.log('✅ Webhook: Detectado pago de comisión.');
                const { id_vendor, id_affiliate } = metadata;
                try {
                    await Affiliate.markAsPaid(id_vendor, id_affiliate);
                    console.log(`✅ Comisiones marcadas como 'paid' para afiliado ${id_affiliate} de tienda ${id_vendor}`);
                } catch (e) {
                    console.log(`❌ Error al procesar Payout de Comisión: ${e.message}`);
                }
            }

            // --- ¡CAMBIO! LÓGICA DE WEBHOOK ACTUALIZADA ---
            // **Flujo B: Es una extensión O COMPRA NUEVA de membresía (gym_memberships)**
            else if (metadata.type === 'membership_extension') {
                console.log('✅ Webhook: Detectado pago de GIMNASIO (membership_extension).');

                const { id_client, id_membership_to_extend, id_plan, duration_days_to_add } = metadata;

                try {
                    // 1. Obtener los detalles del plan que se pagó
                    const plan = await Gym.findById(id_plan);
                    if (!plan) {
                        throw new Error(`No se encontró el Plan (id_plan: ${id_plan}) para esta venta.`);
                    }

                    // 2. Buscar el turno activo para este gimnasio
                    const activeShift = await Pos.findActiveShiftByCompany(plan.id_company);
                    if (!activeShift) {
                        console.log(`⚠️ Webhook: No se encontró turno activo para la Cía. ${plan.id_company}.`);
                    }

                    // 3. Calcular la nueva fecha de vencimiento
                    let newEndDate = new Date();

                    // **¡NUEVA LÓGICA!**
                    // ¿Es una extensión o una compra nueva?
                    // Verificamos si la metadata 'id_membership_to_extend' existe
                    if (id_membership_to_extend) {
                        // --- ES UNA EXTENSIÓN ---
                        const currentSub = await Gym.findMembershipById(id_membership_to_extend);
                        if (currentSub) {
                            const today = new Date();
                            const currentEndDate = new Date(currentSub.end_date);
                            // Si la membresía actual sigue activa, extender desde el final
                            const startDate = (currentEndDate > today) ? currentEndDate : today;
                            newEndDate = new Date(startDate);
                            newEndDate.setDate(newEndDate.getDate() + parseInt(duration_days_to_add));

                            // Desactivar la membresía vieja
                            await Gym.deactivateMembership(id_membership_to_extend, 'extended');
                            console.log(`[Webhook] Membresía ${id_membership_to_extend} extendida.`);
                        }
                    } else {
                        // --- ES UNA COMPRA NUEVA ---
                        // La membresía empieza hoy y dura los días del plan
                        newEndDate.setDate(newEndDate.getDate() + parseInt(duration_days_to_add));
                        console.log(`[Webhook] Creando nueva membresía para cliente ${id_client}.`);
                    }
                    // --- FIN DE LA NUEVA LÓGICA ---

                    // 4. Crear la nueva fila de membresía
                    const newMembershipData = {
                        id_client: id_client,
                        id_company: plan.id_company,
                        plan_name: plan.name,
                        price: plan.price,
                        end_date: newEndDate,
                        payment_method: 'STRIPE_APP',
                        payment_id: paymentIntent.id,
                        id_shift: activeShift ? activeShift.id : null // ¡Conectar al turno!
                    };

                    await Gym.createMembership(newMembershipData);

                    console.log(`✅ Membresía registrada (con turno ${activeShift?.id}) para cliente ${id_client}`);

                } catch (e) {
                    console.log(`❌ Error al procesar Extensión de Membresía: ${e.message}`);
                }
            }
            break;

        // Asegúrate de importar el modelo Wallet arriba en tu archivo
        // const Wallet = require('../models/wallet.js');

        // ... dentro de tu switch (event.type) en stripeWebhook12 ...

        case 'checkout.session.completed':
            const session = event.data.object;
            const metadataSession = session.metadata;

            if (metadataSession && metadataSession.type === 'wallet_topup') {
                console.log('✅ Webhook: Recarga de Billetera detectada.');

                const id_client = metadataSession.id_client;
                const coins_to_add = parseFloat(metadataSession.coins_to_add);
                const reference_id = session.id;

                try {
                    // Llamamos a nuestra transacción SQL mágica
                    await Wallet.processTopUp(id_client, coins_to_add, reference_id);
                    console.log(`✅ ${coins_to_add} Premium Coins agregadas al usuario ${id_client}.`);
                } catch (error) {
                    console.log(`❌ Error al procesar recarga en BD: ${error.message}`);
                }
            }
            break;

        // ... el resto de tus casos (payment_intent.succeeded, etc.)

        default:
            console.log(`Evento de Webhook no manejado: ${event.type}`);
    }

    res.status(200).json({ received: true });
},
*/

    /**
     * (Función original para obtener el estado, ahora usa 'Gym')
     */
    async getSubscriptionStatus(req, res, next) {
        try {
            const id_client = req.user.id;
            const data = await Gym.findActiveByClientId(id_client);

            if (!data) {
                return res.status(200).json({
                    success: true,
                    status: 'inactive',
                    message: 'No se encontró una membresía activa.'
                });
            }

            return res.status(200).json({
                success: true,
                status: data.status,
                data: {
                    plan_name: data.plan_name,
                    end_date: data.end_date
                }
            });

        } catch (error) {
            console.log(`Error en getSubscriptionStatus: ${error}`);
            return res.status(501).json({
                success: false,
                message: 'Error al obtener el estado de la suscripción',
                error: error
            });
        }
    },

    async getSubscriptionStatusTrainer(req, res, next) {
        try {
            const id_client = req.user.id;
            const data = await ClientSubscription.findActiveByClient(id_client);
            console.log(`data de membresia: ${JSON.stringify(data)}`);

            if (!data) {
                return res.status(200).json({
                    success: true,
                    status: 'inactive',
                    message: 'No se encontró una membresía activa.'
                });
            }

            return res.status(200).json({
                success: true,
                status: data.status,
                data: data // <--- ¡ASÍ DE SIMPLE!

            });

        } catch (error) {
            console.log(`Error en getSubscriptionStatus: ${error}`);
            return res.status(501).json({
                success: false,
                message: 'Error al obtener el estado de la suscripción',
                error: error
            });
        }
    },

    async getFree(req, res, next) {
        try {
            const id_client = req.params.id;
            const data = await User.getFree(id_client);

            return res.status(200).json({
                success: true,
                message: 'plan actualizado'
            });

        } catch (error) {
            console.log(`Error en getSubscriptionStatus: ${error}`);
            return res.status(501).json({
                success: false,
                message: 'Error al obtener el estado de la suscripción',
                error: error
            });
        }
    },



    async createExtensionIntent(req, res, next) {
        try {
            const id_client = req.user.id;

            // 1. CORRECCIÓN DE NOMBRES: Leer exactamente lo que envía Flutter
            // Flutter envía: { 'id_plan': ..., 'id_company': ... }
            const { id_plan, id_company: companyIdFromFront } = req.body;

            console.log(`[Intent] Cliente: ${id_client} | Plan: ${id_plan} | Company (Front): ${companyIdFromFront}`);

            let planToPurchase;
            let membershipToExtend;
            let companyId; // El ID final que usaremos
            let activeSub;

            // --- 2. LÓGICA DE VALIDACIÓN DE ID_PLAN (LO QUE PEDISTE) ---

            // Validamos si id_plan es un valor real y útil
            const isPlanIdValid = (id_plan && id_plan !== 'undefined' && id_plan !== 'null' && id_plan !== '');

            if (isPlanIdValid) {
                // CASO A: Viene un ID de plan específico. 
                // Buscamos si ya tiene ESE plan activo para extenderlo.
                console.log(`[Intent] ID Plan válido. Buscando coincidencia exacta...`);
                activeSub = await Gym.findActiveByClientId2(id_client, id_plan);
            } else {
                // CASO B: No viene ID (o es null/undefined).
                // Asumimos que el usuario dio click en "Renovar" sin contexto de plan nuevo.
                // Buscamos CUALQUIER membresía activa que tenga.
                console.log(`[id_client] ${id_client}...`);
                console.log(`[companyId] ${companyIdFromFront}...`);
                activeSub = await Gym.findActiveByClientId(id_client, companyIdFromFront);
                console.log(`entro en el caso B: ${JSON.stringify(activeSub)}`);

            }
            // ----------------------------------------------------------

            if (activeSub) {
                // --- CASO 1: TIENE MEMBRESÍA ACTIVA (RENOVACIÓN) ---
                console.log(`[Intent] Encontrada suscripción activa ID: ${activeSub.id}. Extendiendo...`);

                membershipToExtend = activeSub;
                companyId = activeSub.id_company; // Usamos la company de la BD

                // Intentamos buscar el plan original por nombre para saber el precio actual
                planToPurchase = await Gym.findPlanByName(activeSub.plan_name, activeSub.id_company);

                // Fallback: Si no lo encuentra por nombre, intentamos por ID si existe en el registro
                if (!planToPurchase && activeSub.id_plan) {
                    planToPurchase = await Gym.findById(activeSub.id_plan);
                }

            } else {
                // --- CASO 2: COMPRA NUEVA (No tiene membresía activa) ---
                console.log(`[Intent] No hay suscripción activa. Procesando como compra nueva.`);

                // Si es compra nueva, ES OBLIGATORIO tener el id_plan
                if (!isPlanIdValid) {
                    return res.status(400).json({
                        success: false,
                        message: 'No tienes una membresía activa para renovar. Por favor selecciona un plan nuevo.'
                    });
                }

                planToPurchase = await Gym.findById(id_plan);
                if (planToPurchase) {
                    companyId = planToPurchase.id_company;
                }
            }

            // --- 3. VALIDACIÓN FINAL DE DATOS ---

            // Si companyId no salió de la BD, usamos el que vino del Frontend como respaldo
            if (!companyId && companyIdFromFront) {
                companyId = companyIdFromFront;
            }

            if (!planToPurchase) {
                return res.status(400).json({ success: false, message: 'No se encontró la información del plan a pagar.' });
            }

            if (!companyId) {
                return res.status(400).json({ success: false, message: 'No se pudo identificar al gimnasio/entrenador.' });
            }

            const amountInCents = Math.round(planToPurchase.price * 100);

            // 4. Obtener credenciales de Stripe del Gimnasio
            const company = await User.findCompanyById(companyId);
            if (!company || !company.stripeSecretKey || !company.stripePublishableKey) {
                return res.status(400).json({
                    success: false,
                    message: 'El gimnasio no tiene configurados los pagos con Stripe.'
                });
            }

            const stripe = require('stripe')(company.stripeSecretKey);

            // 5. Gestión de Cliente Stripe
            let customer;
            const existingCustomers = await stripe.customers.list({ email: req.user.email, limit: 1 });

            if (existingCustomers.data.length > 0) {
                customer = existingCustomers.data[0];
            } else {
                customer = await stripe.customers.create({
                    email: req.user.email,
                    name: `${req.user.name} ${req.user.lastname}`,
                });
            }

            // 6. Ephemeral Key
            const ephemeralKey = await stripe.ephemeralKeys.create(
                { customer: customer.id },
                { apiVersion: '2020-08-27' }
            );

            // 7. Payment Intent Metadata
            const metadata = {
                type: 'membership_extension',
                id_client: id_client,
                id_plan: planToPurchase.id,
                duration_days_to_add: planToPurchase.duration_days
            };

            if (membershipToExtend) {
                metadata.id_membership_to_extend = membershipToExtend.id;
            }

            // 8. Crear Intento de Pago
            const extensionIntent = await stripe.paymentIntents.create({
                amount: amountInCents,
                currency: 'mxn',
                customer: customer.id,
                metadata: metadata,
                transfer_data: {
                    destination: company.stripeAccountId,
                },
            });

            return res.status(200).json({
                success: true,
                message: 'Intención de pago creada',
                data: {
                    clientSecret: extensionIntent.client_secret,
                    ephemeralKey: ephemeralKey.secret,
                    customerId: customer.id,
                    publishableKey: company.stripePublishableKey,
                    gymName: company.name
                }
            });

        } catch (error) {
            console.log(`Error en createExtensionIntent: ${error}`);
            return res.status(501).json({
                success: false,
                message: 'Error interno al procesar el pago',
                error: error.message
            });
        }
    },

    async createManualRequest(req, res, next) {
        try {
            const { id_plan, id_company } = req.body;
            const id_client = req.user.id;
            const finalStatus = req.body.status;

            console.log(`[Manual Request] Cliente: ${id_client} -> Plan: ${id_plan}`);

            // 0. VALIDACIÓN ANTI-SPAM
            // Verificamos si este cliente YA tiene este plan en estado 'PENDING'
            const existingRequest = await ClientSubscription.findPendingByClient(id_client, id_plan);

            if (existingRequest) {
                return res.status(409).json({ // 409 Conflict
                    success: false,
                    message: 'Ya tienes una solicitud pendiente para este plan. Espera a que tu entrenador la apruebe.'
                });
            }

            // 1. VALIDACIÓN DE EXISTENCIA DEL PLAN Y OBTENCIÓN DE DÍAS
            const plan = await ClientSubscription.findById(id_plan);

            if (!plan) {
                return res.status(404).json({ success: false, message: 'El plan seleccionado ya no existe.' });
            }

            // 2. PREPARAR OBJETO
            // Ya no calculamos fechas aquí. Solo pasamos los datos y la duración.
            const subscriptionData = {
                id_client: id_client,
                id_company: id_company,
                id_plan: id_plan,
                duration_days: plan.durationInDays, // <--- PASAMOS EL DATO AL MODELO
                status: finalStatus
            };

            // 3. INSERTAR EN BD (El modelo calculará la fecha de vencimiento)
            const data = await ClientSubscription.createManual(subscriptionData);

            // 4. VINCULACIÓN AUTOMÁTICA
            await User.updateTrainer(id_client, id_company);

            return res.status(201).json({
                success: true,
                message: 'Solicitud enviada. Tu entrenador ha sido notificado.',
                data: { 'id': data.id }
            });

        } catch (error) {
            console.log(`Error en createManualRequest: ${error}`);
            return res.status(501).json({
                success: false,
                message: 'Error al crear la solicitud',
                error: error.message
            });
        }
    },

    // ... otras funciones ...

    // 1. OBTENER SOLICITUDES PENDIENTES (Para el Entrenador)
    async getPendingRequests(req, res, next) {
        try {
            const id_company = req.user.mi_store; // El ID del entrenador

            // Hacemos JOIN para traer datos del cliente y del plan
            const sql = `
                SELECT 
                    S.id,
                    S.id_client,
                    S.id_plan,
                    S.status,
                    S.created_at,
                    U.name AS client_name,
                    U.notification_token AS token,
                    U.lastname AS client_lastname,
                    U.image AS client_image,
                    P.name AS plan_name,
                    P.price AS plan_price,
                    U.phone,
					P."durationInDays"
                FROM 
                    client_subscriptions AS S
                INNER JOIN
                    users AS U ON S.id_client = U.id
                INNER JOIN
                    subscription_plans AS P ON S.id_plan = P.id
                WHERE
                    S.id_company = $1 AND S.status = 'PENDING'
                ORDER BY
                    S.created_at DESC
            `;

            const db = require('../config/config');
            const data = await db.manyOrNone(sql, id_company);

            return res.status(200).json(data);

        } catch (error) {
            console.log(`Error en getPendingRequests: ${error}`);
            return res.status(501).json({ success: false, message: 'Error al obtener solicitudes' });
        }
    },

    // 2. APROBAR SOLICITUD (Activar Plan)
    // ... imports

    // ... dentro de la clase ClientSubscriptionsController ...

    async approveRequest(req, res, next) {
        try {
            const { id_subscription } = req.body;
            const db = require('../config/config');

            const sql = `
                UPDATE client_subscriptions cs
                SET 
                    status = 'active',
                    current_period_end = NOW() + (sp."durationInDays" || ' days')::INTERVAL,
                    updated_at = NOW()
                FROM subscription_plans sp
                WHERE cs.id = $1 AND cs.id_plan = sp.id
                RETURNING cs.id_client
            `;

            const result = await db.oneOrNone(sql, [id_subscription]);

            if (!result) {
                return res.status(404).json({ success: false, message: 'Suscripción no encontrada o plan inválido.' });
            }

            // 🔥 NUEVO: Actualizamos el nivel del usuario a VIP (2) porque el entrenador aprobó el pago
            const User = require('../models/user.js');
            await User.updateAccessLevel(result.id_client, 2);

            return res.status(200).json({ success: true, message: 'Suscripción activada exitosamente.' });

        } catch (error) {
            console.log(`Error en approveRequest: ${error}`);
            return res.status(501).json({ success: false, message: 'Error al activar', error: error.message });
        }
    },
    /**
     * POST /api/subscriptions/create-recurring-registration
     * Creado específicamente para el registro web (Flutter).
     * Recibe los datos del plan directamente del frontend.
     */
    // Nueva función para el registro recurrente
    async createRecurringRegistrationIntent(req, res, next) {
        try {
            const { id_plan, id_company, stripe_price_id, duration_days, customer_email } = req.body;

            const company = await User.findCompanyById(id_company);
            const stripe = require('stripe')(company.stripeSecretKey);

            const customer = await stripe.customers.create({
                email: customer_email.toLowerCase(),
                metadata: { registration_email: customer_email.toLowerCase() }
            });

            // 🚀 AQUÍ ESTÁ LA CORRECCIÓN: Agregamos payment_settings para evitar el log de "Sin Metadata"
            const subscriptionConfig = {
                customer: customer.id,
                items: [{ price: stripe_price_id }],
                transfer_data: { destination: company.stripeAccountId },
                payment_behavior: 'default_incomplete',
                expand: ['latest_invoice.payment_intent'],
                metadata: {
                    type: 'client_subscription_payment',
                    id_company: id_company,
                    id_plan: id_plan,
                    duration_days: duration_days || 30,
                    temp_email: customer_email.toLowerCase()
                },
                // Forzamos la metadata al PaymentIntent inicial
                payment_settings: {
                    save_default_payment_method: 'on_subscription',
                    payment_method_options: {
                        card: { mandate_options: { amount_type: 'fixed' } }
                    }
                }
            };

            const subscription = await stripe.subscriptions.create(subscriptionConfig);

            // Inyectamos manualmente para que el Webhook lo reciba a la primera
            if (subscription.latest_invoice && subscription.latest_invoice.payment_intent) {
                await stripe.paymentIntents.update(
                    subscription.latest_invoice.payment_intent.id,
                    { metadata: subscriptionConfig.metadata }
                );
            }

            return res.status(200).json({
                success: true,
                subscriptionId: subscription.id,
                clientSecret: subscription.latest_invoice.payment_intent.client_secret,
                publishableKey: company.stripePublishableKey
            });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    },
    // ...
};
