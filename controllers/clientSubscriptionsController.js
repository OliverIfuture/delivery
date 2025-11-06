const ClientSubscription = require('../models/clientSubscription.js');
const User = require('../models/user.js'); // Usamos el modelo User para obtener la info de la compañía
const keys = require('../config/keys.js'); // Asumo que tienes tus claves de Stripe aquí

// Esta es tu CLAVE SECRETA DE WEBHOOK.
// Debes generarla en tu Dashboard de Stripe en la sección "Webhooks"
// y añadirla a tu archivo 'keys.js' o .env
const endpointSecret = keys.stripeWebhookSecret; 

module.exports = {

    /**
     * Crea una sesión de Stripe Checkout para un plan específico.
     * El cliente es redirigido a esta sesión para pagar.
     */
    async createCheckoutSession(req, res, next) {
        try {
            const { id_plan, id_company, price_id } = req.body;
            const id_client = req.user.id;
            
            // 1. Obtener la compañía (entrenador) para usar su clave secreta de Stripe
            const company = await User.findCompanyById(id_company);
            if (!company || !company.stripeSecretKey) {
                return res.status(400).json({
                    success: false,
                    message: 'El entrenador no tiene una clave de Stripe configurada.'
                });
            }
            
            const stripe = require('stripe')(company.stripeSecretKey);

            // 2. Crear un Cliente en Stripe (o buscar uno existente)
            // Usamos el email del usuario logueado
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

            // 3. Crear la Sesión de Checkout
            const session = await stripe.checkout.sessions.create({
                payment_method_types: ['card'],
                line_items: [
                    {
                        price: price_id, // El ID del precio del plan (ej. price_1P...)
                        quantity: 1,
                    },
                ],
                mode: 'subscription', // ¡Importante! Esto lo hace recurrente
                customer: customer.id,
                // URLs a las que Stripe redirigirá al usuario
                // Debes crear estas páginas en tu app de Flutter
                success_url: 'https://tu-app.com/checkout/success?session_id={CHECKOUT_SESSION_ID}',
                cancel_url: 'https://tu-app.com/checkout/cancel',
                
                // Guardamos nuestros IDs de BD en los metadatos de Stripe
                // para saber a quién activar cuando el Webhook nos avise.
                subscription_data: {
                    metadata: {
                        id_client: id_client,
                        id_company: id_company,
                        id_plan: id_plan
                    }
                }
            });

            // 4. Devolver la URL de pago a la app de Flutter
            return res.status(200).json({
                success: true,
                url: session.url, // La app de Flutter debe abrir esta URL
                id: session.id
            });

        } catch (error) {
            console.log(`Error en createCheckoutSession: ${error}`);
            return res.status(501).json({
                success: false,
                message: 'Error al crear la sesión de pago',
                error: error.message
            });
        }
    },

    /**
     * Endpoint para que Stripe nos avise de eventos (ej. pago exitoso)
     */
    async stripeWebhook(req, res, next) {
        // Esta función es compleja y requiere 'stripe' y 'express.raw'
        // Por ahora, nos centraremos en el evento 'checkout.session.completed'
        
        const sig = req.headers['stripe-signature'];
        let event;

        try {
            // Nota: Esto requiere que uses `app.use(express.raw({type: 'application/json'}));` 
            // O una configuración especial para que el webhook reciba el body "crudo" (raw)
            // Para este controlador, asumiremos que estás usando la clave secreta del ADMIN para verificar
            const adminStripe = require('stripe')(keys.stripeAdminSecretKey); // Clave del admin para verificar
            event = adminStripe.webhooks.constructEvent(req.body, sig, endpointSecret);
        
        } catch (err) {
            console.log(`❌ Error en Webhook: ${err.message}`);
            return res.status(400).send(`Webhook Error: ${err.message}`);
        }

        // Manejar el evento
        switch (event.type) {
            case 'checkout.session.completed':
                const session = event.data.object;
                
                // Obtener los metadatos que guardamos
                const metadata = session.subscription_data.metadata;
                
                // Crear el registro de suscripción en nuestra BD
                const subscriptionData = {
                    id_client: metadata.id_client,
                    id_company: metadata.id_company,
                    id_plan: metadata.id_plan,
                    stripe_subscription_id: session.subscription, // ID de la suscripción
                    stripe_customer_id: session.customer,
                    status: 'active', // ¡Activado!
                    // (Aquí también deberíamos obtener 'current_period_end' de Stripe)
                };

                await ClientSubscription.create(subscriptionData);
                console.log('✅ Suscripción creada y activada en la BD para el cliente:', metadata.id_client);
                break;
                
            case 'invoice.payment_failed':
                // El pago recurrente falló
                const subscriptionId = event.data.object.subscription;
                await ClientSubscription.updateStatus(subscriptionId, 'past_due');
                console.log('⚠️ Pago fallido para suscripción:', subscriptionId);
                break;
                
            case 'customer.subscription.deleted':
                // El cliente canceló desde el portal de Stripe
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
