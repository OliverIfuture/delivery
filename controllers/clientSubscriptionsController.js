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

            // 2. OBTENER DATOS DEL PLAN DE LA BD (Precio y Días)
            const SubscriptionPlan = require('../models/subscriptionPlan');
            const planInfo = await ClientSubscription.findById(id_plan);

            if (!planInfo) {
                return res.status(404).json({ success: false, message: 'Plan no encontrado' });
            }

            const durationDays = planInfo.durationInDays ? planInfo.durationInDays : 30;
            const originalPrice = parseFloat(planInfo.price); // Precio base de la BD

            const stripeInstance = require('stripe')(company.stripeSecretKey);

            // 3. Gestión del Cliente (Customer)
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

            // --- 4. CÁLCULO MANUAL DEL PRECIO FINAL (PAGO ÚNICO) ---
            // Como es pago único, Stripe no aplica cupones automáticos. Lo calculamos aquí.

            let finalAmount = originalPrice;
            let discountApplied = 'NO';

            if (discount_percent && !isNaN(parseFloat(discount_percent)) && parseFloat(discount_percent) > 0) {
                const discountDecimal = parseFloat(discount_percent) / 100;
                finalAmount = originalPrice - (originalPrice * discountDecimal);
                discountApplied = 'YES';
                console.log(`Aplicando descuento manual: ${originalPrice} - ${discount_percent}% = ${finalAmount}`);
            }

            // Convertir a centavos (Stripe siempre usa centavos)
            // Math.round es vital para evitar errores de decimales flotantes (ej. 199.999999)
            const amountInCents = Math.round(finalAmount * 100);

            // Seguridad: El monto mínimo en MXN suele ser 10 pesos (1000 centavos) aprox
            if (amountInCents < 1000) {
                // Manejo opcional si el descuento deja el precio muy bajo
            }
            // -------------------------------------------------------


            // 5. Crear el PaymentIntent (Pago Único)
            const paymentIntent = await stripeInstance.paymentIntents.create({
                amount: amountInCents,
                currency: 'mxn',
                customer: customer.id,
                description: `Plan: ${planInfo.name} (${durationDays} días)`,

                // Configuración para transferir dinero al entrenador (Connect)
                transfer_data: {
                    destination: company.stripeAccountId,
                },

                // --- METADATA CRÍTICA PARA EL WEBHOOK ---
                metadata: {
                    type: 'client_subscription_payment', // Cambiamos el tipo para identificarlo
                    id_client: id_client,
                    id_company: id_company,
                    id_plan: id_plan,
                    discount_applied: discountApplied,
                    duration_days: durationDays // Días para calcular vencimiento
                }
            });



            // 6. (Opcional) Crear registro en BD como 'PENDING' ahora mismo
            // Esto ayuda a tener un rastro antes de que el usuario pague
            // Puedes usar ClientSubscription.createManual con status 'PENDING_PAYMENT' si quieres

            return res.status(200).json({
                success: true,
                paymentIntentId: paymentIntent.id, // ID del intento
                clientSecret: paymentIntent.client_secret, // Lo que necesita Flutter
                customerId: customer.id,
                publishableKey: company.stripePublishableKey
            });

        } catch (error) {
            console.log(`Error CRÍTICO en createSubscriptionIntent (Pago Único): ${error}`);
            return res.status(501).json({
                success: false,
                message: 'Error al procesar el pago',
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
                items: [{ price: price_id }],
                transfer_data: {
                    destination: company.stripeAccountId,
                },
                payment_behavior: 'default_incomplete',
                payment_settings: { save_default_payment_method: 'on_subscription' },
                expand: ['latest_invoice.payment_intent'],
                metadata: {
                    type: 'client_subscription',
                    id_client: id_client,
                    id_company: id_company,
                    id_plan: id_plan,
                    discount_applied: couponId ? 'YES' : 'NO' // Meta-data útil
                }
            };

            // 5. INYECCIÓN SEGURA DEL CUPÓN
            // Solo agregamos la propiedad 'coupon' si couponId tiene un valor real
            if (couponId) {
                subscriptionConfig.coupon = couponId;
            }

            // Creación final
            const subscription = await stripeInstance.subscriptions.create(subscriptionConfig);

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
    async stripeWebhook(req, res, next) {

        const sig = req.headers['stripe-signature'];
        let event;

        try {
            if (!keys.stripeAdminSecretKey || !endpointSecret) {
                console.log('❌ Error en Webhook: Faltan claves.');
                return res.status(500).send('Error de configuración.');
            }
            event = adminStripe.webhooks.constructEvent(req.rawBody, sig, endpointSecret);

        } catch (err) {
            console.log(`❌ Error en Webhook (constructEvent): ${err.message}`);
            return res.status(400).send(`Webhook Error: ${err.message}`);
        }

        // Manejar el evento
        switch (event.type) {

            // =================================================================
            // CASO PRINCIPAL: PAGOS ÚNICOS EXITOSOS (Entrenadores y Gym)
            // =================================================================
            case 'payment_intent.succeeded':
                const paymentIntent = event.data.object;
                const metadata = paymentIntent.metadata;

                console.log(`🔔 Webhook PaymentIntent: Tipo ${metadata.type}`);

                // -------------------------------------------------------------
                // A) PAGO DE ENTRENADOR (Plan de Entrenamiento)
                // -------------------------------------------------------------
                if (metadata.type === 'client_subscription_payment') {
                    console.log('✅ Procesando pago de Entrenador...');

                    const { id_client, id_company, id_plan, duration_days } = metadata;

                    // 1. Calcular Fecha de Vencimiento
                    const days = parseInt(duration_days) || 30; // Default 30 si falla
                    const expirationDate = new Date();
                    expirationDate.setDate(expirationDate.getDate() + days);

                    // 2. Crear registro en BD
                    const subscriptionData = {
                        id_client: id_client,
                        id_company: id_company,
                        id_plan: id_plan,
                        stripe_subscription_id: paymentIntent.id, // Guardamos el PI como ID
                        stripe_customer_id: paymentIntent.customer,
                        status: 'active', // Nace activa
                        current_period_end: expirationDate
                    };

                    try {
                        await ClientSubscription.create(subscriptionData);
                        console.log(`✅ Suscripción creada para cliente ${id_client} hasta ${expirationDate.toISOString()}`);

                        // 3. Vincular Entrenador
                        if (id_client && id_company) {
                            await User.updateTrainer(id_client, id_company);
                            await User.transferClientData(id_client, id_company);
                        }
                    } catch (e) {
                        console.log(`❌ Error creando suscripción local: ${e.message}`);
                    }
                }

                // -------------------------------------------------------------
                // B) PAGO DE GIMNASIO (Membresía Física)
                // -------------------------------------------------------------
                else if (metadata.type === 'membership_extension' || metadata.type === 'gym_membership_payment') {
                    console.log('✅ Procesando pago de Gimnasio...');

                    const { id_client, id_membership_to_extend, id_plan, duration_days } = metadata;
                    // Usamos duration_days si viene, o duration_days_to_add para compatibilidad
                    const daysRaw = duration_days || metadata.duration_days_to_add;
                    const daysToAdd = parseInt(daysRaw) || 30;

                    try {
                        // 1. Obtener datos del plan (para company_id)
                        const plan = await Gym.findById(id_plan);
                        if (!plan) throw new Error(`Plan ${id_plan} no encontrado`);

                        // 2. Calcular Fechas
                        let newEndDate = new Date();

                        // Si es extensión, sumamos a la fecha actual de la membresía vieja
                        if (id_membership_to_extend) {
                            const currentSub = await Gym.findMembershipById(id_membership_to_extend);
                            if (currentSub) {
                                const today = new Date();
                                const currentEnd = new Date(currentSub.end_date);
                                // Si no ha vencido, extendemos desde su fecha fin. Si ya venció, desde hoy.
                                const startDate = (currentEnd > today) ? currentEnd : today;

                                newEndDate = new Date(startDate);
                                newEndDate.setDate(newEndDate.getDate() + daysToAdd);

                                // Desactivar la vieja
                                await Gym.deactivateMembership(id_membership_to_extend, 'extended');
                            }
                        } else {
                            // Compra nueva: Hoy + Días
                            newEndDate.setDate(newEndDate.getDate() + daysToAdd);
                        }

                        // 3. Buscar Turno Activo (Caja) del Gym
                        const activeShift = await Pos.findActiveShiftByCompany(plan.id_company);

                        // 4. Registrar Membresía
                        const newMembershipData = {
                            id_client: id_client,
                            id_company: plan.id_company,
                            plan_name: plan.name,
                            price: plan.price,
                            end_date: newEndDate,
                            payment_method: 'STRIPE_APP',
                            payment_id: paymentIntent.id,
                            id_shift: activeShift ? activeShift.id : null
                        };

                        await Gym.createMembership(newMembershipData);
                        console.log(`✅ Membresía Gym registrada para ${id_client} hasta ${newEndDate.toISOString()}`);

                    } catch (e) {
                        console.log(`❌ Error procesando Gym Membership: ${e.message}`);
                    }
                }

                // -------------------------------------------------------------
                // C) PAGO DE COMISIÓN (Afiliados)
                // -------------------------------------------------------------
                else if (metadata.type === 'commission_payout') {
                    console.log('✅ Procesando pago de Comisión...');
                    const { id_vendor, id_affiliate } = metadata;
                    try {
                        await Affiliate.markAsPaid(id_vendor, id_affiliate);
                        console.log('✅ Comisión marcada como pagada.');
                    } catch (e) {
                        console.log(`❌ Error Affiliate: ${e.message}`);
                    }
                }
                break;

            case 'payment_intent.payment_failed':
                console.log('❌ Webhook: Intento de pago fallido:', event.data.object.id);
                break;

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

            default:
                console.log(`Evento no manejado: ${event.type}`);
        }

        res.status(200).json({ received: true });
    },

    /**
     * WEBHOOK DE STRIPE
     * (Esta función maneja TODAS las confirmaciones de pago)
     */
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
                duration_days: plan.durationInDays // <--- PASAMOS EL DATO AL MODELO
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

            // Actualizamos estado a ACTIVE y reseteamos las fechas HOY + DÍAS DEL PLAN
            // Hacemos un JOIN implícito (o subconsulta) para obtener la duración del plan
            const sql = `
                UPDATE client_subscriptions cs
                SET 
                    status = 'active',
                    -- Calculamos la fecha final sumando los días del plan a la fecha actual (NOW())
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

            return res.status(200).json({ success: true, message: 'Suscripción activada exitosamente.' });

        } catch (error) {
            console.log(`Error en approveRequest: ${error}`);
            return res.status(501).json({ success: false, message: 'Error al activar', error: error.message });
        }
    },

    // ...
};
