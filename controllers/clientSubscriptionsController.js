const ClientSubscription = require('../models/clientSubscription.js');
const User = require('../models/user.js'); 
const Affiliate  = require('../models/affiliate.js'); 
const keys = require('../config/keys.js'); 
// **CAMBIO: Importamos Gym y POS**
const Gym = require('../models/gym.js');
const Pos = require('../models/pos.js'); // <-- ¡NUEVO IMPORT!

const endpointSecret = keys.stripeWebhookSecret; 
const adminStripe = require('stripe')(keys.stripeAdminSecretKey); 

module.exports = {

    /**
     * ¡NUEVA FUNCIÓN!
     * Crea un PaymentIntent (pago único) para extender una membresía existente.
     * (Usa la tabla 'gym_memberships')
     */
    async createExtensionIntent(req, res, next) {
        try {
            const id_client = req.user.id;
            console.log(`[ExtIntent] Iniciando para cliente: ${id_client}`);

            // 1. Buscar la suscripción activa del cliente (Usando Gym model)
            const activeSub = await Gym.findActiveByClientId(id_client); 
            
            if (!activeSub || !activeSub.plan_name || !activeSub.id_company) {
                console.log(`[ExtIntent] ERROR: No se encontró suscripción activa para el cliente ${id_client}.`);
                return res.status(400).json({
                    success: false,
                    message: 'No se encontró una membresía activa para extender.'
                });
            }

            // 2. Obtener los detalles del plan (precio, duración)
            const plan = await Gym.findPlanByName(activeSub.plan_name, activeSub.id_company); 
            
            if (!plan || !plan.price || !plan.duration_days) {
                console.log(`[ExtIntent] ERROR: No se encontró el plan con nombre ${activeSub.plan_name}.`);
                return res.status(400).json({
                    success: false,
                    message: 'No se pudieron encontrar los detalles del plan de membresía.'
                });
            }
            const amountInCents = Math.round(plan.price * 100); 

            // 3. Obtener la compañía (Gimnasio)
            const company = await User.findCompanyById(activeSub.id_company);
            if (!company || !company.stripeSecretKey || !company.stripePublishableKey) {
                console.log(`[ExtIntent] ERROR: El gimnasio ${activeSub.id_company} no tiene claves de Stripe.`);
                return res.status(400).json({
                    success: false,
                    message: 'El gimnasio no tiene una clave de Stripe configurada.'
                });
            }

            const stripe = require('stripe')(company.stripeSecretKey);

            // 4. Crear/Obtener un Cliente en Stripe (en la cuenta del Gimnasio)
            let customer;
            const existingCustomers = await stripe.customers.list({
                email: req.user.email,
                limit: 1
            });

            if (existingCustomers.data.length > 0) {
                customer = existingCustomers.data[0];
            } else {
                customer = await stripe.customers.create({
                    email: req.user.email,
                    name: `${req.user.name} ${req.user.lastname}`,
                });
            }
            
            // 5. Crear una Clave Efímera
            const ephemeralKey = await stripe.ephemeralKeys.create(
                { customer: customer.id },
                { apiVersion: '2020-08-27' }
            );

            // 6. Crear el Payment Intent
            const extensionIntent = await stripe.paymentIntents.create({
                amount: amountInCents,
                currency: 'mxn', // o la moneda que uses
                customer: customer.id,
                metadata: {
                    type: 'membership_extension', // Identificador
                    id_client: id_client,
                    id_membership_to_extend: activeSub.id, 
                    duration_days_to_add: plan.duration_days
                }
            });

            // 7. Devolver todos los secretos al SDK de Flutter
            return res.status(200).json({
                success: true,
                clientSecret: extensionIntent.client_secret,
                ephemeralKey: ephemeralKey.secret,
                customerId: customer.id,
                publishableKey: company.stripePublishableKey,
                gymName: company.name
            });

        } catch (error) {
            console.log(`Error en createExtensionIntent: ${error}`);
            return res.status(501).json({
                success: false,
                message: 'Error al crear la intención de extensión',
                error: error.message
            });
        }
    },


    /**
     * (Esta es tu función original para NUEVAS suscripciones)
     * (Utiliza 'ClientSubscription' - La dejamos como estaba)
     */
    async createSubscriptionIntent(req, res, next) {
        try {
            const { id_plan, id_company, price_id } = req.body;
            const id_client = req.user.id;
            
            const company = await User.findCompanyById(id_company);
            if (!company || !company.stripeSecretKey) {
                return res.status(400).json({
                    success: false,
                    message: 'El entrenador no tiene una clave de Stripe configurada.'
                });
            }
            
            const stripe = require('stripe')(company.stripeSecretKey);

            let customer;
            const existingCustomers = await stripe.customers.list({
                email: req.user.email,
                limit: 1
            });

            if (existingCustomers.data.length > 0) {
                customer = existingCustomers.data[0];
            } else {
                customer = await stripe.customers.create({
                    email: req.user.email,
                    name: `${req.user.name} ${req.user.lastname}`,
                });
            }

            const subscription = await stripe.subscriptions.create({
                customer: customer.id,
                items: [{ price: price_id }],
                payment_behavior: 'default_incomplete', 
                payment_settings: { save_default_payment_method: 'on_subscription' },
                expand: ['latest_invoice.payment_intent'], 
                metadata: {
                    type: 'client_subscription', 
                    id_client: id_client,
                    id_company: id_company,
                    id_plan: id_plan
                }
            });

            return res.status(200).json({
                success: true,
                subscriptionId: subscription.id,
                clientSecret: subscription.latest_invoice.payment_intent.client_secret, 
                customerId: customer.id,
                publishableKey: company.stripePublishableKey 
            });

        } catch (error) {
            console.log(`Error en createSubscriptionIntent: ${error}`);
            return res.status(501).json({
                success: false,
                message: 'Error al crear la intención de suscripción',
                error: error.message
            });
        }
    },

    /**
     * WEBHOOK DE STRIPE - ACTUALIZADO
     */
    async stripeWebhook(req, res, next) {
        
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
            
            // --- Caso 1: Suscripción de Cliente Creada/Pagada (client_subscriptions) ---
            case 'invoice.payment_succeeded':
                const invoice = event.data.object;
                
                if (invoice.billing_reason === 'subscription_create' || invoice.billing_reason === 'subscription_cycle') {
                    const subscriptionId = invoice.subscription;
                    const customerId = invoice.customer;
                    
                    const subscription = await adminStripe.subscriptions.retrieve(subscriptionId);
                    const metadata = subscription.metadata;

                    if (metadata.type === 'client_subscription') { 
                        const subscriptionData = {
                            id_client: metadata.id_client,
                            id_company: metadata.id_company,
                            id_plan: metadata.id_plan,
                            stripe_subscription_id: subscriptionId,
                            stripe_customer_id: customerId,
                            status: 'active', 
                            current_period_end: new Date(subscription.current_period_end * 1000)
                        };
                        // Esta lógica usa tu modelo ClientSubscription
                        await ClientSubscription.create(subscriptionData);
                        console.log('✅ Webhook: Suscripción (ClientSubscription) creada para el cliente:', metadata.id_client);

                        if (metadata.id_client && metadata.id_company) {
                             await User.updateTrainer(metadata.id_client, metadata.id_company);
                             console.log(`✅ Webhook: Usuario ${metadata.id_client} vinculado al entrenador ${metadata.id_company}`);
                        }
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
                
                // **Flujo B: ¡NUEVA LÓGICA! Es una extensión de membresía (gym_memberships)**
                else if (metadata.type === 'membership_extension') {
                    console.log('✅ Webhook: Detectado pago de EXTENSIÓN (gym_memberships).');
                    
                    const { id_client, id_membership_to_extend, duration_days_to_add } = metadata; 

                    try {
                        // 1. Encontrar la membresía que vamos a extender
                        const currentSub = await Gym.findMembershipById(id_membership_to_extend); 
                        if (!currentSub) {
                            throw new Error(`No se encontró la membresía ${id_membership_to_extend} para extender.`);
                        }

                        // **¡NUEVA LÓGICA DE TURNO!**
                        // 2. Buscar el turno activo para este gimnasio
                        // ¡AQUÍ ESTÁ EL CAMBIO!
                        const activeShift = await Pos.findActiveShiftByCompany(currentSub.id_company);

                        if (!activeShift) {
                            console.log(`⚠️ Webhook: No se encontró turno activo para la compañía ${currentSub.id_company}. La venta se registrará sin turno.`);
                        }

                        // 3. Calcular la nueva fecha de vencimiento
                        const today = new Date();
                        const currentEndDate = new Date(currentSub.end_date);
                        const startDate = (currentEndDate > today) ? currentEndDate : today;
                        const newEndDate = new Date(startDate);
                        newEndDate.setDate(newEndDate.getDate() + parseInt(duration_days_to_add));

                        // 4. Desactivar la membresía vieja
                        await Gym.deactivateMembership(id_membership_to_extend, 'extended');

                        // 5. Crear la nueva membresía (¡AHORA CON EL ID_SHIFT!)
                        const newMembershipData = {
                            id_client: id_client,
                            id_company: currentSub.id_company,
                            plan_name: currentSub.plan_name,
                            price: currentSub.price,
                            end_date: newEndDate,
                            payment_method: 'STRIPE_APP', // Identificador de pago
                            payment_id: paymentIntent.id,
                            id_shift: activeShift ? activeShift.id : null // ¡AQUÍ ESTÁ LA CONEXIÓN!
                        };

                        await Gym.createMembership(newMembershipData);
                        
                        console.log(`✅ Membresía extendida (con turno ${activeShift?.id}) para cliente ${id_client}`);

                    } catch (e) {
                        console.log(`❌ Error al procesar Extensión de Membresía: ${e.message}`);
                    }
                }
                break;
            
            default:
                console.log(`Evento de Webhook no manejado: ${event.type}`);
        }

        res.status(200).json({ received: true });
    },

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

};
