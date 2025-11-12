const Affiliate = require('../models/affiliate.js');

module.exports = {

    /**
     * Obtiene el historial de comisiones para el entrenador logueado
     */
    async getMyCommissions(req, res, next) {
        try {
            // El ID del entrenador (afiliado) viene del token
            const id_company_affiliate = req.user.mi_store;

            if (!id_company_affiliate) {
                 return res.status(400).json({ success: false, message: 'El usuario no es un afiliado (no tiene compañía).'});
            }

            const data = await Affiliate.getCommissionsByAffiliate(id_company_affiliate);
            
            return res.status(200).json(data);

        } catch (error) {
            console.log(`Error en affiliateController.getMyCommissions: ${error}`);
            return res.status(501).json({
                success: false,
                message: 'Error al obtener las comisiones',
                error: error.message
            });
        }
    },

        /**
     * **NUEVA FUNCIÓN: (Paso 15.8a)**
     * Obtiene el dashboard de pagos pendientes para la Tienda (Vendedor) logueada.
     */
    async getMyVendorDashboard(req, res, next) {
        try {
            const id_company_vendor = req.user.mi_store;

            if (!id_company_vendor) {
                 return res.status(400).json({ success: false, message: 'El usuario no es un vendedor.'});
            }

            const data = await Affiliate.getPendingPayoutsByVendor(id_company_vendor);
            return res.status(200).json(data);

        } catch (error) {
            console.log(`Error en affiliateController.getMyVendorDashboard: ${error}`);
            return res.status(501).json({
                success: false,
                message: 'Error al obtener el dashboard de pagos',
                error: error.message
            });
        }
    },

    /**
     * **NUEVA FUNCIÓN: (Paso 15.8a)**
     * La Tienda (Vendedor) marca las comisiones de un Entrenador como pagadas.
     */
    async markCommissionsAsPaid(req, res, next) {
        try {
            const id_company_vendor = req.user.mi_store;
            const { id_affiliate } = req.body; // El ID del Entrenador al que le pagó

            if (!id_company_vendor) {
                 return res.status(400).json({ success: false, message: 'El usuario no es un vendedor.'});
            }
            if (!id_affiliate) {
                return res.status(400).json({ success: false, message: 'Falta el ID del afiliado (entrenador).'});
            }

            await Affiliate.markAsPaid(id_company_vendor, id_affiliate);
            
            return res.status(200).json({
                success: true,
                message: 'Comisiones marcadas como pagadas.'
            });

        } catch (error) {
            console.log(`Error en affiliateController.markCommissionsAsPaid: ${error}`);
            return res.status(501).json({
                success: false,
                message: 'Error al marcar comisiones como pagadas',
                error: error.message
            });
        }
    },

        /**
     * **FUNCIÓN CORREGIDA: (Paso 15.8c - Lógica de Pago Directo)**
     * La Tienda (Vendedor) paga al Entrenador (Afiliado).
     */
    async createPayoutIntent(req, res, next) {
        try {
            const { id_affiliate, amount } = req.body; // ID del Entrenador (quien recibe), Monto a pagar
            const id_vendor = req.user.mi_store; // ID de la Tienda (quien paga)
            
            if (!id_affiliate || !amount) {
                return res.status(400).json({ success: false, message: 'Faltan datos.'});
            }

            // 1. Obtener los datos del ENTRENADOR (Afiliado) para usar SUS claves
            const affiliateCompany = await User.findCompanyById(id_affiliate);
            if (!affiliateCompany || !affiliateCompany.stripeSecretKey || !affiliateCompany.stripePublishableKey) {
                return res.status(400).json({ success: false, message: 'Este entrenador no tiene claves de Stripe configuradas para recibir pagos.'});
            }

            // 2. Inicializar Stripe CON LA CLAVE SECRETA DEL ENTRENADOR
            const stripe = require('stripe')(affiliateCompany.stripeSecretKey);

            // 3. Crear un Cliente en Stripe (si no existe)
            // Este cliente es la TIENDA, pero creada en la cuenta del ENTRENADOR
            let customerId;
            const existingCustomers = await stripe.customers.list({ email: req.user.email, limit: 1 });
            if (existingCustomers.data.length > 0) {
                customerId = existingCustomers.data[0].id;
            } else {
                const customer = await stripe.customers.create({ 
                    email: req.user.email, 
                    name: req.user.name,
                    description: `Tienda Vendedora ID: ${id_vendor}`
                });
                customerId = customer.id;
            }

            // 4. Crear el Payment Intent (Cobro)
            const amountInCents = (parseFloat(amount) * 100).toFixed(0);
            
            const paymentIntent = await stripe.paymentIntents.create({
                amount: amountInCents,
                currency: 'mxn',
                customer: customerId, // El ID de Cliente (Tienda)
                // **Metadatos para el Webhook**
                metadata: {
                    type: 'commission_payout', // Tipo de pago
                    id_vendor: id_vendor,       // Quién pagó
                    id_affiliate: id_affiliate, // Quién recibió
                    amount_paid: amount
                }
            });

            // 5. Devolver los secretos al SDK de Flutter de la Tienda
            return res.status(200).json({
                success: true,
                clientSecret: paymentIntent.client_secret, // El secreto del cobro
                publishableKey: affiliateCompany.stripePublishableKey, // La clave PÚBLICA del Entrenador
                customerId: customerId,
            });

        } catch (error) {
            console.log(`Error en createPayoutIntent: ${error}`);
            return res.status(501).json({ success: false, message: 'Error al crear la intención de pago', error: error.message });
        }
    },
    
    /**
     * **ACTUALIZADO: (Paso 15.8c)**
     * El Webhook ahora solo MARCA COMO PAGADO. No transfiere.
     * (Esta función debe estar en tu controlador de Webhooks, ej: clientSubscriptionsController.js)
     */
    async stripeWebhook(req, res, next) {
        
        const sig = req.headers['stripe-signature'];
        let event;

        try {
            // (El 'adminStripe' y 'endpointSecret' deben estar definidos al inicio del archivo)
            if (!keys.stripeAdminSecretKey || !endpointSecret) {
                return res.status(500).send('Error de configuración del webhook.');
            }
            event = adminStripe.webhooks.constructEvent(req.rawBody, sig, endpointSecret);
        
        } catch (err) {
            console.log(`❌ Error en Webhook (constructEvent): ${err.message}`);
            return res.status(400).send(`Webhook Error: ${err.message}`);
        }

        // Manejar el evento
        switch (event.type) {
            
            // ... (tus casos existentes: invoice.payment_succeeded, account.updated, etc.) ...
            
            // **NUEVO CASO: La Tienda pagó al Entrenador**
            case 'payment_intent.succeeded':
                const paymentIntent = event.data.object;
                const metadata = paymentIntent.metadata;

                // Verificamos si es un pago de comisión
                if (metadata.type === 'commission_payout') {
                    console.log('✅ Webhook: Detectado pago de comisión (Directo Tienda->Entrenador).');
                    const id_vendor = metadata.id_vendor;
                    const id_affiliate = metadata.id_affiliate;

                    try {
                        // **LÓGICA SIMPLIFICADA: Solo marcar como pagado**
                        // El dinero ya se transfirió automáticamente a la cuenta 'destination' (Entrenador)
                        await Affiliate.markAsPaid(id_vendor, id_affiliate);
                        console.log(`✅ Comisiones marcadas como 'paid' para afiliado ${id_affiliate} de tienda ${id_vendor}`);
                        
                    } catch (e) {
                        console.log(`❌ Error al procesar Payout de Comisión: ${e.message}`);
                    }
                }
                break;
            
            default:
                console.log(`Evento de Webhook no manejado: ${event.type}`);
        }

        res.status(200).json({ received: true });
    },

};
