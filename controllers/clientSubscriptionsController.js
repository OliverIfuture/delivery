const ClientSubscription = require('../models/clientSubscription.js');
const User = require('../models/user.js'); 
const keys = require('../config/keys.js'); 

const endpointSecret = keys.stripeWebhookSecret; 
// Clave secreta del Admin (o una clave de plataforma) para verificar el webhook
// Es más seguro usar la clave de la cuenta que *recibe* el webhook
const adminStripe = require('stripe')(keys.stripeAdminSecretKey); 

module.exports = {

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
            // Usamos req.rawBody (que configuramos en server.js)
            event = adminStripe.webhooks.constructEvent(req.rawBody, sig, endpointSecret);
        
        } catch (err) {
            console.log(`❌ Error en Webhook: ${err.message}`);
            return res.status(400).send(`Webhook Error: ${err.message}`);
        }

        // Manejar el evento
        switch (event.type) {
            
            // CAMBIO: Este es el nuevo evento para suscripciones
            case 'invoice.payment_succeeded':
                const invoice = event.data.object;
                
                // Si es el primer pago de una suscripción
                if (invoice.billing_reason === 'subscription_create') {
                    const subscriptionId = invoice.subscription;
                    const customerId = invoice.customer;
                    
                    // Necesitamos obtener la suscripción para leer los metadatos
                    const subscription = await adminStripe.subscriptions.retrieve(subscriptionId);
                    const metadata = subscription.metadata;

                    // Crear el registro de suscripción en nuestra BD
                    const subscriptionData = {
                        id_client: metadata.id_client,
                        id_company: metadata.id_company,
                        id_plan: metadata.id_plan,
                        stripe_subscription_id: subscriptionId,
                        stripe_customer_id: customerId,
                        status: 'active', // ¡Activado!
                        current_period_end: new Date(subscription.current_period_end * 1000)
                    };

                    await ClientSubscription.create(subscriptionData);
                    console.log('✅ Suscripción (Webhook) creada y activada en la BD para el cliente:', metadata.id_client);
                }
                break;
                
            case 'invoice.payment_failed':
                // El pago recurrente falló
                const subscriptionId = event.data.object.subscription;
                await ClientSubscription.updateStatus(subscriptionId, 'past_due');
                console.log('⚠️ Pago fallido para suscripción:', subscriptionId);
                break;
                
            case 'customer.subscription.deleted':
                // El cliente canceló
                const canceledSubId = event.data.object.id;
                await ClientSubscription.updateStatus(canceledSubId, 'canceled');
                console.log('❌ Suscripción cancelada:', canceledSubId);
                break;
            
            default:
                console.log(`Evento de Webhook no manejado: ${event.type}`);
        }

        // Devolver respuesta 200 a Stripe
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
