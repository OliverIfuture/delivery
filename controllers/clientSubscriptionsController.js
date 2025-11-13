const ClientSubscription = require('../models/clientSubscription.js');
const User = require('../models/user.js'); 
const Affiliate  = require('../models/affiliate.js'); 
const keys = require('../config/keys.js'); 
const Gym = require('../models/gym.js');

const endpointSecret = keys.stripeWebhookSecret; 
// Clave secreta del Admin (o una clave de plataforma) para verificar el webhook
// Es más seguro usar la clave de la cuenta que *recibe* el webhook
const adminStripe = require('stripe')(keys.stripeAdminSecretKey); 

module.exports = {

        async createExtensionIntent(req, res, next) {
        try {
            const id_client = req.user.id;

            // 1. Buscar la suscripción activa del cliente
            const activeSub = await ClientSubscription.findActiveByClient(id_client);
            if (!activeSub || !activeSub.id_plan || !activeSub.id_company) {
                return res.status(400).json({
                    success: false,
                    message: 'No se encontró una membresía activa para extender.'
                });
            }

            // 2. Obtener los detalles del plan (precio, duración)
            const plan = await Gym.findById(activeSub.id_plan);
            if (!plan || !plan.price || !plan.duration_days) {
                return res.status(400).json({
                    success: false,
                    message: 'No se pudieron encontrar los detalles del plan de membresía.'
                });
            }
            // Asumimos que el precio está guardado en centavos (ej. 10000 para $100.00)
            const amountInCents = Math.round(plan.price * 100); 

            // 3. Obtener la compañía (Gimnasio) para usar su clave secreta y su ID de Stripe
            const company = await User.findCompanyById(activeSub.id_company);
            if (!company || !company.stripeSecretKey || !company.stripePublishableKey) {
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
            
            // 5. Crear una Clave Efímera (para que el SDK de Flutter pueda usar el customer)
            const ephemeralKey = await stripe.ephemeralKeys.create(
                { customer: customer.id },
                { apiVersion: '2020-08-27' } // Usa una versión de API estable
            );

            // 6. Crear el Payment Intent (el pago único)
            const paymentIntent = await stripe.paymentIntents.create({
                amount: amountInCents,
                currency: 'mxn', // o la moneda que uses
                customer: customer.id,
                // **CRUCIAL: La metadata para el webhook**
                metadata: {
                    type: 'membership_extension', // Identificador
                    id_client: id_client,
                    id_subscription_to_extend: activeSub.id, // ID de la fila en nuestra BD
                    id_plan: activeSub.id_plan,
                    duration_days_to_add: plan.duration_days
                }
            });

            // 7. Devolver todos los secretos al SDK de Flutter
            return res.status(200).json({
                success: true,
                clientSecret: paymentIntent.client_secret,
                ephemeralKey: ephemeralKey.secret,
                customerId: customer.id,
                publishableKey: company.stripePublishableKey,
                gymName: company.name // Bonus: el nombre del gym para el PaymentSheet
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
     * NUEVA FUNCIÓN: Crea una suscripción y devuelve el PaymentIntent
     * para el SDK nativo de Flutter.
     */
    async createSubscriptionIntent(req, res, next) {
        try {
            const { id_plan, id_company, price_id } = req.body;
            const id_client = req.user.id;
            
            // 1. Obtener la compañía (entrenador) para usar su clave secreta
            const company = await User.findCompanyById(id_company);
            if (!company || !company.stripeSecretKey) {
                return res.status(400).json({
                    success: false,
                    message: 'El entrenador no tiene una clave de Stripe configurada.'
                });
            }
            
            const stripe = require('stripe')(company.stripeSecretKey);

            // 2. Crear/Obtener un Cliente en Stripe
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

            // 3. Crear la Suscripción
            // La "magia" está en 'payment_behavior: 'default_incomplete''
            // y 'expand: ['latest_invoice.payment_intent']'
            const subscription = await stripe.subscriptions.create({
                customer: customer.id,
                items: [{ price: price_id }], // El ID del precio (ej. price_1P...)
                payment_behavior: 'default_incomplete', // No la cobra, solo la prepara
                payment_settings: { save_default_payment_method: 'on_subscription' },
                expand: ['latest_invoice.payment_intent'], // Pide que se genere la 1ra factura
                metadata: {
                    id_client: id_client,
                    id_company: id_company,
                    id_plan: id_plan
                }
            });

            // 4. Devolver los secretos al SDK de Flutter
            return res.status(200).json({
                success: true,
                subscriptionId: subscription.id,
                // El secreto del cliente para la hoja de pago nativa
                clientSecret: subscription.latest_invoice.payment_intent.client_secret, 
                customerId: customer.id,
                // La clave pública del entrenador (NO LA SECRETA)
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
     * Escucha eventos de facturas (invoice) en lugar de checkout
     */
    async stripeWebhook(req, res, next) {
        
        const sig = req.headers['stripe-signature'];
        let event;

        try {
            if (!keys.stripeAdminSecretKey || !endpointSecret) {
                console.log('❌ Error en Webhook: Faltan claves STRIPE_ADMIN_SECRET_KEY o STRIPE_WEBHOOK_SECRET.');
                return res.status(500).send('Error de configuración del webhook.');
            }
            // Ya usamos 'adminStripe' definido al inicio del archivo
            event = adminStripe.webhooks.constructEvent(req.rawBody, sig, endpointSecret);
        
        } catch (err) {
            console.log(`❌ Error en Webhook (constructEvent): ${err.message}`);
            return res.status(400).send(`Webhook Error: ${err.message}`);
        }

        // Manejar el evento
        switch (event.type) {
            
            // --- Caso 1: Suscripción de Cliente Creada/Pagada ---
            case 'invoice.payment_succeeded':
                const invoice = event.data.object;
                
                if (invoice.billing_reason === 'subscription_create' || invoice.billing_reason === 'subscription_cycle') {
                    const subscriptionId = invoice.subscription;
                    const customerId = invoice.customer;
                    
                    const subscription = await adminStripe.subscriptions.retrieve(subscriptionId);
                    const metadata = subscription.metadata;

                    // Asegurarnos que es una suscripción de cliente y no un payout
                    if (metadata.type === 'client_subscription') {
                        // 1. Crear el registro de suscripción
                        const subscriptionData = {
                            id_client: metadata.id_client,
                            id_company: metadata.id_company,
                            id_plan: metadata.id_plan,
                            stripe_subscription_id: subscriptionId,
                            stripe_customer_id: customerId,
                            status: 'active', 
                            current_period_end: new Date(subscription.current_period_end * 1000)
                        };
                        await ClientSubscription.create(subscriptionData);
                        console.log('✅ Webhook: Suscripción creada para el cliente:', metadata.id_client);

                        // 2. Vincular al entrenador en la tabla 'users'
                        if (metadata.id_client && metadata.id_company) {
                             await User.updateTrainer(metadata.id_client, metadata.id_company);
                             console.log(`✅ Webhook: Usuario ${metadata.id_client} vinculado al entrenador ${metadata.id_company}`);
                        }
                    }
                }
                break;
            
            // --- Casos de Falla/Cancelación de Suscripción ---
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
                 // (Aquí iría tu lógica para actualizar 'chargesEnabled' en la tabla 'company')
                 break;

            // --- **NUEVO CASO: PAGO DE COMISIÓN (TIENDA -> ENTRENADOR)** ---
            case 'payment_intent.succeeded':
                const paymentIntent = event.data.object;
                const metadata = paymentIntent.metadata;

                // Verificamos si es un pago de comisión
                if (metadata.type === 'commission_payout') {
                    console.log('✅ Webhook: Detectado pago de comisión (Directo Tienda->Entrenador).');
                    const id_vendor = metadata.id_vendor;
                    const id_affiliate = metadata.id_affiliate;

                    try {
                        // **LÓGICA: Marcar como pagado en nuestra BD**
                        // El dinero ya se movió automáticamente a la cuenta del Entrenador
                        // porque el 'paymentIntent' se creó usando la clave del Entrenador.
                        await Affiliate.markAsPaid(id_vendor, id_affiliate);
                        console.log(`✅ Comisiones marcadas como 'paid' para afiliado ${id_affiliate} de tienda ${id_vendor}`);
                        
                    } catch (e) {
                        console.log(`❌ Error al procesar Payout de Comisión: ${e.message}`);
                    }
                }
                break;

             case 'payment_intent.succeeded':
                const paymentIntent = event.data.object;
                const metadata = paymentIntent.metadata;

                // **Flujo A: Es un pago de comisión de Afiliado**
                if (metadata.type === 'commission_payout') {
                    console.log('✅ Webhook: Detectado pago de comisión (Directo Tienda->Entrenador).');
                    // ... (Tu lógica existente de 'Affiliate.markAsPaid' no cambia)
                    
                    try {
                        await Affiliate.markAsPaid(metadata.id_vendor, metadata.id_affiliate);
                        console.log(`✅ Comisiones marcadas como 'paid' para afiliado ${metadata.id_affiliate}`);
                    } catch (e) {
                        console.log(`❌ Error al procesar Payout de Comisión: ${e.message}`);
                    }
                }
                
                // **Flujo B: ¡NUEVA LÓGICA! Es una extensión de membresía**
                else if (metadata.type === 'membership_extension') {
                    console.log('✅ Webhook: Detectado pago de EXTENSIÓN de membresía.');
                    
                    const { id_client, id_subscription_to_extend, duration_days_to_add } = metadata;

                    try {
                        // 1. Encontrar la suscripción que vamos a extender
                        const currentSub = await ClientSubscription.findById(id_subscription_to_extend);
                        if (!currentSub) {
                            throw new Error(`No se encontró la suscripción ${id_subscription_to_extend} para extender.`);
                        }

                        // 2. Calcular la nueva fecha de vencimiento
                        // Lógica: Usar la fecha de fin actual, o HOY (la que sea más tarde)
                        // y sumarle los días del plan.
                        const today = new Date();
                        const currentEndDate = new Date(currentSub.current_period_end);
                        
                        // Determinar la fecha de inicio para la extensión
                        const startDate = (currentEndDate > today) ? currentEndDate : today;

                        // Calcular la nueva fecha de fin
                        const newEndDate = new Date(startDate);
                        newEndDate.setDate(newEndDate.getDate() + parseInt(duration_days_to_add));

                        // 3. Actualizar la BD con la nueva fecha
                        await ClientSubscription.updateEndDate(id_subscription_to_extend, newEndDate);
                        
                        console.log(`✅ Membresía ${id_subscription_to_extend} extendida para cliente ${id_client} hasta ${newEndDate.toISOString()}`);

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
     * Verifica el estado de la suscripción de un cliente
     */
    async getSubscriptionStatus(req, res, next) {
        // (Esta función sigue igual y es correcta)
        try {
            const id_client = req.user.id; // El ID del cliente logueado
            const data = await ClientSubscription.findActiveByClient(id_client);
            
            if (!data) {
                return res.status(200).json({
                    success: true,
                    status: 'inactive',
                    message: 'No se encontró una suscripción activa.'
                });
            }

            return res.status(200).json({
                success: true,
                status: data.status, // 'active', 'past_due', 'canceled'
                data: data
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
