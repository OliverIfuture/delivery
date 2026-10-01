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
const MembershipAddon = require('../models/membershipAddon.js');
const User = require('../models/user.js');
const { isUnrestricted: isUnrestrictedUser, FLEX_ADDON_ID } = require('../utils/membershipGate.js');
const storage = require('../utils/cloud_storage.js');
const stripe = require('stripe')(keys.stripeAdminSecretKey);

const PLATFORM_FEE_PERCENT = '9.5';
// Días de gracia reales de los PLANES BASE (fundador/monthly/quarterly/
// plan_50) — se cobra hasta el día 6. Flex Ilimitado NO tiene periodo de
// gracia (ver activateAddon) — se cobra de inmediato al activarlo.
const MEMBERSHIP_TRIAL_DAYS = 5;

// Antes PLATFORM_FEE_PERCENT solo viajaba como metadata informativa (ver
// nota arriba de createCheckout) — el dinero completo se quedaba en la
// cuenta admin (COBI) sin ningún movimiento real. Pedido explícito:
// transferir de verdad el (100 - PLATFORM_FEE_PERCENT)% de cada cobro
// (primer pago Y renovaciones automáticas, transfer_data es una
// propiedad de la suscripción, no de un solo invoice) a esta cuenta de
// Stripe Connect — COBI se queda con el PLATFORM_FEE_PERCENT restante.
// Hardcodeado a propósito por ahora (pedido explícito) — si en el futuro
// hay que hacerlo configurable, sacarlo a keys.js o a una tabla real.
const MEMBERSHIP_PAYOUT_DESTINATION_ACCOUNT_ID = 'acct_1ShJ6XFREGUwQ83V';
const MEMBERSHIP_TRANSFER_DATA = {
    destination: MEMBERSHIP_PAYOUT_DESTINATION_ACCOUNT_ID,
    amount_percent: 100 - Number(PLATFORM_FEE_PERCENT)
};

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
                    recurring: { interval: 'month', interval_count: plan.duration_in_months, trial_period_days: MEMBERSHIP_TRIAL_DAYS }
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
                transfer_data: MEMBERSHIP_TRANSFER_DATA,
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
    },

    // NUEVO — para una cuenta que hasta ahora se manejaba SOLO por
    // transferencia manual (membership_stripe_subscription_id nulo o una
    // suscripción vieja que nunca llegó a cobrar, ver getMyMembershipStatus)
    // y que ahora sí quiere domiciliarse de verdad. A diferencia de
    // createCheckout (Payment Element embebido, cobra de inmediato), aquí
    // se manda un Checkout Session real (página hospedada de Stripe) para
    // que el entrenador pueda abrirlo desde donde sea — y con `trial_end`
    // opcional para no cobrar nada hoy si ya pagó manual su periodo actual:
    // el primer cobro real ocurre justo en esa fecha, y de ahí en
    // adelante se renueva solo. Mismo patrón que
    // createDomiciliationLink/confirmDomiciliation en
    // clientSubscriptionsController.js, pero contra la cuenta de Stripe de
    // LA PLATAFORMA (no Connect) — ver header de este archivo.
    async createDomiciliationCheckout(req, res) {
        try {
            const id_company = req.user.mi_store;
            const { id_plan, start_billing_at } = req.body;
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
            if (!plan.stripe_price_id) {
                return res.status(400).json({ success: false, message: 'Este plan todavía no tiene un precio real de Stripe.' });
            }

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

            const subscriptionData = {
                transfer_data: MEMBERSHIP_TRANSFER_DATA,
                metadata: {
                    type: 'membership_payment',
                    id_company: String(id_company),
                    id_plan: plan.id,
                    platform_fee_percent: PLATFORM_FEE_PERCENT
                }
            };
            // start_billing_at (opcional): fecha ISO a partir de la cual debe
            // ocurrir el PRIMER cobro real — para una cuenta que ya traía un
            // periodo pagado manual y no se le debe cobrar doble hoy.
            if (start_billing_at) {
                const trialEnd = Math.floor(new Date(start_billing_at).getTime() / 1000);
                if (!Number.isFinite(trialEnd) || trialEnd <= Math.floor(Date.now() / 1000)) {
                    return res.status(400).json({ success: false, message: 'start_billing_at debe ser una fecha real en el futuro.' });
                }
                subscriptionData.trial_end = trialEnd;
            }

            const baseUrl = 'https://deliveryserver.herokuapp.com';
            const session = await stripe.checkout.sessions.create({
                mode: 'subscription',
                customer: customerId,
                line_items: [{ price: plan.stripe_price_id, quantity: 1 }],
                success_url: `${baseUrl}/api/membership/confirmDomiciliation?session_id={CHECKOUT_SESSION_ID}&id_company=${id_company}&id_plan=${plan.id}`,
                cancel_url: `${baseUrl}/api/membership/domiciliacionCancelada`,
                subscription_data: subscriptionData
            });

            return res.status(200).json({ success: true, data: { url: session.url } });
        } catch (error) {
            console.log(`Error en membershipController.createDomiciliationCheckout: ${error}`);
            return res.status(501).json({ success: false, message: 'Error al generar el enlace de domiciliación', error: error.message });
        }
    },

    // PÚBLICO — a donde Stripe redirige el navegador al terminar el
    // Checkout Session de arriba (nunca se confía en query params solos:
    // se vuelve a consultar la sesión real con Stripe antes de activar nada).
    async confirmDomiciliation(req, res) {
        try {
            const { session_id, id_company, id_plan } = req.query;
            if (!session_id || !id_company) return res.status(400).send('Faltan datos para confirmar.');

            const session = await stripe.checkout.sessions.retrieve(session_id, { expand: ['subscription'] });
            if (session.status !== 'complete' || !session.subscription) {
                return res.status(400).send('El pago todavía no se completó.');
            }
            const subscription = session.subscription;
            const expiresAt = subscription.current_period_end ? new Date(subscription.current_period_end * 1000) : null;

            await db.none(`
                UPDATE company
                SET membership_stripe_subscription_id = $2, membership_status = $3, membership_expires_at = $4
                    ${id_plan ? ', membership_plan = $5' : ''}
                WHERE id = $1
            `, id_plan ? [id_company, subscription.id, subscription.status, expiresAt, id_plan] : [id_company, subscription.id, subscription.status, expiresAt]);

            return res.send('<h2>¡Listo! Tu membresía ya quedó domiciliada.</h2><p>Puedes cerrar esta ventana.</p>');
        } catch (error) {
            console.log(`Error en membershipController.confirmDomiciliation: ${error}`);
            return res.status(501).send('No se pudo confirmar la domiciliación.');
        }
    },

    async domiciliacionCancelada(req, res) {
        return res.send('<h2>Domiciliación cancelada.</h2><p>No se guardó ningún cambio. Puedes cerrar esta ventana.</p>');
    },

    // ===================== Perfil (pestaña "Perfil") =====================
    async getMyProfile(req, res) {
        try {
            const id_company = req.user.mi_store;
            const user = await User.findProfileFields(req.user.id);
            const company = id_company ? await db.oneOrNone(`SELECT name, logo, brand_color FROM company WHERE id = $1`, [id_company]) : null;
            return res.status(200).json({
                success: true,
                data: {
                    name: user.name, lastname: user.lastname, email: user.email, image: user.image,
                    username: user.username, title: user.title, bio: user.bio,
                    specializations: user.specializations || [], instagramUrl: user.instagram_url, websiteUrl: user.website_url,
                    companyName: company?.name || '', companyLogo: company?.logo || '', brandColor: company?.brand_color || null
                }
            });
        } catch (error) {
            console.log(`Error en membershipController.getMyProfile: ${error}`);
            return res.status(501).json({ success: false, message: 'Error al obtener tu perfil', error: error.message });
        }
    },

    // Multipart — logo opcional (files.logo), avatar opcional (files.image).
    async updateMyProfile(req, res) {
        try {
            const id_company = req.user.mi_store;
            const body = req.body.data ? JSON.parse(req.body.data) : req.body;
            const files = req.files || {};

            let imageUrl = null;
            if (files.image && files.image.length > 0) {
                imageUrl = await storage(files.image[0], `user_image_${Date.now()}`);
            }
            let logoUrl = null;
            if (files.logo && files.logo.length > 0) {
                logoUrl = await storage(files.logo[0], `company_logo_${Date.now()}`);
            }

            await User.updateOwnProfile(req.user.id, {
                name: body.name, lastname: body.lastname, image: imageUrl,
                username: body.username, title: body.title, bio: body.bio,
                specializations: body.specializations, instagramUrl: body.instagramUrl, websiteUrl: body.websiteUrl
            });

            if (id_company && (body.companyName || logoUrl)) {
                await User.updateCompanyProfile(id_company, { name: body.companyName, logo: logoUrl });
            }

            return res.status(200).json({ success: true, message: 'Perfil actualizado.' });
        } catch (error) {
            console.log(`Error en membershipController.updateMyProfile: ${error}`);
            return res.status(501).json({ success: false, message: 'Error al actualizar tu perfil', error: error.message });
        }
    },

    // ===================== Apariencia (pestaña "Apariencia") =====================
    async updateMyAppearance(req, res) {
        try {
            const id_company = req.user.mi_store;
            if (!id_company) {
                return res.status(403).json({ success: false, message: 'Tu cuenta no tiene una empresa asignada.' });
            }
            const { brandColor } = req.body;
            if (!brandColor) {
                return res.status(400).json({ success: false, message: 'Falta brandColor.' });
            }
            await User.updateCompanyAppearance(id_company, { brandColor });
            return res.status(200).json({ success: true, message: 'Apariencia actualizada.' });
        } catch (error) {
            console.log(`Error en membershipController.updateMyAppearance: ${error}`);
            return res.status(501).json({ success: false, message: 'Error al actualizar la apariencia', error: error.message });
        }
    },

    // ===================== Estado real de la membresía (gating) =====================
    // Usado para: (a) bloquear la app si venció, (b) mostrar el popup de
    // "cambia de plan" cuando el entrenador ya llegó a su límite de
    // clientes de verdad.
    // Verifica el estado REAL con Stripe (no solo el que quedó guardado
    // en company.membership_status) — si un cobro de renovación falla
    // (tarjeta rechazada, etc.) Stripe marca la suscripción como
    // 'past_due'/'unpaid'/'canceled' y eso debe bloquear la app de
    // inmediato, sin esperar a que llegue membership_expires_at.
    async getMyMembershipStatus(req, res) {
        try {
            const id_company = req.user.mi_store;
            if (!id_company) {
                return res.status(403).json({ success: false, message: 'Tu cuenta no tiene una empresa asignada.' });
            }
            const company = await User.getCompanyMembershipInfo(id_company);
            const plan = company?.membership_plan ? await MembershipPlan.findById(company.membership_plan) : null;
            // Solo cuenta contra el límite del plan quien de verdad tiene
            // una membresía vigente AHORA (activa o vencida/past_due) —
            // cancelada ya no cuenta (ese cliente pasa a Prospectos en el
            // frontend, ver clientsWithMembership/prospects en
            // useRealClients.js) ni tampoco quien nunca tuvo ninguna
            // suscripción — y la fila "de sí mismo" (ver models/
            // selfClient.js, is_self_client) tampoco cuenta nunca.
            const clientCountRow = await db.one(
                `SELECT COUNT(DISTINCT u.id)::int AS n
                 FROM users u
                 INNER JOIN client_subscriptions cs ON cs.id_client = u.id
                 WHERE u.id_entrenador = $1 AND u.is_self_client IS NOT TRUE
                   AND cs.status IN ('active', 'past_due')`,
                [id_company]
            );
            const clientCount = clientCountRow.n;
            const clientLimit = plan ? Number(plan.client_limit) : null;

            const now = new Date();
            let expiresAt = company?.membership_expires_at ? new Date(company.membership_expires_at) : null;
            let isExpired = !!expiresAt && expiresAt.getTime() < now.getTime();
            let liveStatus = company?.membership_status || 'inactive';
            // Por defecto, igual que antes: "tiene suscripción" = hay un id
            // guardado. Se corrige abajo si Stripe dice que ese id nunca
            // llegó a completar el primer pago (ver 'incomplete').
            let hasStripeSubscription = !!company?.membership_stripe_subscription_id;

            if (company?.membership_stripe_subscription_id) {
                try {
                    const sub = await stripe.subscriptions.retrieve(company.membership_stripe_subscription_id);
                    // Un checkout abandonado a medias (el entrenador cerró
                    // sin terminar de capturar la tarjeta) deja el id
                    // guardado pero la suscripción real nunca cobró nada —
                    // sin esto, "elegir un plan" se veía como
                    // "Actualizar plan" (falla al no haber nada que
                    // actualizar de verdad) en vez de ofrecer un checkout
                    // nuevo otra vez.
                    if (sub.status === 'incomplete' || sub.status === 'incomplete_expired') {
                        hasStripeSubscription = false;
                    }
                    const BLOCKING_STATUSES = ['past_due', 'unpaid', 'canceled', 'incomplete_expired'];
                    if (BLOCKING_STATUSES.includes(sub.status)) {
                        isExpired = true;
                        liveStatus = sub.status;
                    } else if ((sub.status === 'active' || sub.status === 'trialing') && sub.current_period_end) {
                        // No hay webhook que avise de las RENOVACIONES
                        // automáticas de esta suscripción (solo del primer
                        // cobro, ver confirmPayment) — así que aquí, cada
                        // vez que se consulta el estado real, se
                        // sincroniza membership_expires_at contra el corte
                        // real de Stripe. Sin esto, después del primer
                        // periodo la fecha guardada se queda congelada y
                        // MembershipExpiredGate.vue terminaría bloqueando a
                        // un cliente que sigue pagando de verdad.
                        const stripeExpiresAt = new Date(sub.current_period_end * 1000);
                        if (!expiresAt || Math.abs(stripeExpiresAt.getTime() - expiresAt.getTime()) > 60000) {
                            await db.none(`UPDATE company SET membership_expires_at = $2, membership_status = 'active' WHERE id = $1`, [id_company, stripeExpiresAt]);
                            expiresAt = stripeExpiresAt;
                        }
                        isExpired = false;
                        liveStatus = 'active';
                    }
                } catch (stripeErr) {
                    console.log(`No se pudo verificar la suscripción real en Stripe: ${stripeErr.message}`);
                }
            }

            const daysUntilExpiry = expiresAt ? Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : null;

            // Complementos activos reales — para el selector de "qué
            // suscripción quieres cancelar" (ver cancelAddonOrMembership).
            const activeAddons = await MembershipAddon.findActiveByCompany(id_company);

            // Empresas/cuentas exentas (ver isUnrestricted en
            // membershipGate.js, misma función que ya bloquea de verdad al
            // invitar clientes y al usar Flex) — nunca deben ver el gate de
            // membresía vencida ni el popup de límite de clientes, sin
            // importar el plan/estado real que tengan asignado. Por correo
            // (no solo por id de company) para cubrir una cuenta de pruebas
            // que cambia a mano de company (ver UNRESTRICTED_EMAILS).
            const isUnrestricted = isUnrestrictedUser(id_company, req.user.email);
            const finalIsExpired = isUnrestricted ? false : isExpired;
            const finalIsOverClientLimit = isUnrestricted ? false : (clientLimit != null && clientCount > clientLimit);
            // El gate real de Flex (hasFlexAddon en membershipGate.js) ya
            // deja pasar a esta cuenta sin importar la company — pero el
            // frontend decide si MOSTRAR la UI de IA mirando activeAddons
            // (ver hasFlexAddon computed en useMembershipGate.js), que viene
            // de la fila real en company_addons de LA COMPANY ACTUAL. Como
            // esta cuenta cambia de company a mano, casi nunca tendría esa
            // fila ahí — sin esto, el botón de "Crear plan con IA" se
            // escondería aunque el backend sí lo dejaría generar.
            const activeAddonsOut = activeAddons.map((a) => ({ id: a.id_addon, name: a.name, price: Number(a.price) }));
            if (isUnrestricted && !activeAddonsOut.some((a) => a.id === FLEX_ADDON_ID)) {
                activeAddonsOut.push({ id: FLEX_ADDON_ID, name: 'Flex Ilimitado', price: 0 });
            }

            return res.status(200).json({
                success: true,
                data: {
                    plan: plan ? { id: plan.id, name: plan.name, price: Number(plan.price), clientLimit } : null,
                    status: liveStatus,
                    expiresAt: expiresAt ? expiresAt.toISOString() : null,
                    isExpired: finalIsExpired,
                    daysUntilExpiry,
                    clientCount,
                    clientLimit,
                    // Antes usaba >= — un plan "Hasta N clientes" marcaba a un
                    // entrenador con EXACTAMENTE N clientes (dentro de lo que
                    // su plan permite) como "pasado del límite", bloqueándolo
                    // sin que en realidad se hubiera excedido de nada.
                    isOverClientLimit: finalIsOverClientLimit,
                    activeAddons: activeAddonsOut,
                    // Cuentas migradas/antiguas tienen membership_plan (ej.
                    // 'fundador') pero NUNCA pasaron por /membership/checkout
                    // -> no tienen membership_stripe_subscription_id. El
                    // frontend usa esto para decidir si "elegir un plan"
                    // debe iniciar un checkout nuevo (con Payment Element,
                    // primera tarjeta) en vez de intentar actualizar una
                    // suscripción de Stripe que no existe (cambiar de plan
                    // sí la requiere).
                    hasStripeSubscription
                }
            });
        } catch (error) {
            console.log(`Error en membershipController.getMyMembershipStatus: ${error}`);
            return res.status(501).json({ success: false, message: 'Error al obtener el estado de tu membresía', error: error.message });
        }
    },

    // ===================== Método de pago real =====================
    async getMyPaymentMethod(req, res) {
        try {
            const id_company = req.user.mi_store;
            const company = await User.getCompanyMembershipInfo(id_company);
            if (!company?.membership_stripe_customer_id) {
                return res.status(200).json({ success: true, data: null });
            }
            const methods = await stripe.paymentMethods.list({ customer: company.membership_stripe_customer_id, type: 'card' });
            const card = methods.data[0]?.card;
            if (!card) {
                return res.status(200).json({ success: true, data: null });
            }
            return res.status(200).json({ success: true, data: { brand: card.brand, last4: card.last4, expMonth: card.exp_month, expYear: card.exp_year } });
        } catch (error) {
            console.log(`Error en membershipController.getMyPaymentMethod: ${error}`);
            return res.status(501).json({ success: false, message: 'Error al obtener tu método de pago', error: error.message });
        }
    },

    // Crea un SetupIntent real para capturar una tarjeta nueva (sin cobrar
    // nada) — el frontend confirma con Stripe Elements y luego llama a
    // confirmCardUpdate con el id de la tarjeta ya guardada.
    async createCardUpdateIntent(req, res) {
        try {
            const id_company = req.user.mi_store;
            const company = await User.getCompanyMembershipInfo(id_company);
            if (!company?.membership_stripe_customer_id) {
                return res.status(400).json({ success: false, message: 'Todavía no tienes una cuenta de facturación iniciada.' });
            }
            const setupIntent = await stripe.setupIntents.create({
                customer: company.membership_stripe_customer_id,
                payment_method_types: ['card']
            });
            return res.status(200).json({
                success: true,
                data: { clientSecret: setupIntent.client_secret, publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || '' }
            });
        } catch (error) {
            console.log(`Error en membershipController.createCardUpdateIntent: ${error}`);
            return res.status(501).json({ success: false, message: 'Error al iniciar el cambio de tarjeta', error: error.message });
        }
    },

    async confirmCardUpdate(req, res) {
        try {
            const id_company = req.user.mi_store;
            const { payment_method_id } = req.body;
            if (!payment_method_id) {
                return res.status(400).json({ success: false, message: 'Falta payment_method_id.' });
            }
            const company = await User.getCompanyMembershipInfo(id_company);
            if (!company?.membership_stripe_customer_id) {
                return res.status(400).json({ success: false, message: 'Todavía no tienes una cuenta de facturación iniciada.' });
            }
            await stripe.customers.update(company.membership_stripe_customer_id, {
                invoice_settings: { default_payment_method: payment_method_id }
            });
            if (company.membership_stripe_subscription_id) {
                await stripe.subscriptions.update(company.membership_stripe_subscription_id, { default_payment_method: payment_method_id });
            }
            return res.status(200).json({ success: true, message: 'Método de pago actualizado.' });
        } catch (error) {
            console.log(`Error en membershipController.confirmCardUpdate: ${error}`);
            return res.status(501).json({ success: false, message: 'Error al actualizar tu método de pago', error: error.message });
        }
    },

    // ===================== Recibos reales (Stripe Invoices) =====================
    async getMyInvoices(req, res) {
        try {
            const id_company = req.user.mi_store;
            const company = await User.getCompanyMembershipInfo(id_company);
            if (!company?.membership_stripe_customer_id) {
                return res.status(200).json({ success: true, data: [] });
            }
            const invoices = await stripe.invoices.list({ customer: company.membership_stripe_customer_id, limit: 24 });
            const data = invoices.data.map((inv) => ({
                id: inv.id,
                date: new Date(inv.created * 1000),
                amount: (inv.amount_paid || inv.total) / 100,
                currency: inv.currency,
                status: inv.status,
                hostedUrl: inv.hosted_invoice_url,
                pdfUrl: inv.invoice_pdf
            }));
            return res.status(200).json({ success: true, data });
        } catch (error) {
            console.log(`Error en membershipController.getMyInvoices: ${error}`);
            return res.status(501).json({ success: false, message: 'Error al obtener tus recibos', error: error.message });
        }
    },

    // ===================== Cambiar de plan (upgrade/downgrade real) =====================
    async changeMyPlan(req, res) {
        try {
            const id_company = req.user.mi_store;
            const { id_plan } = req.body;
            if (!id_plan) {
                return res.status(400).json({ success: false, message: 'Falta id_plan.' });
            }
            const newPlan = await MembershipPlan.findById(id_plan);
            if (!newPlan) {
                return res.status(404).json({ success: false, message: 'Plan no encontrado.' });
            }
            const company = await User.getCompanyMembershipInfo(id_company);
            if (!company?.membership_stripe_subscription_id) {
                return res.status(400).json({ success: false, message: 'Todavía no tienes una suscripción activa — usa /checkout primero.' });
            }

            let stripePriceId = newPlan.stripe_price_id;
            if (!stripePriceId) {
                const product = await stripe.products.create({ name: newPlan.name, description: `Membresía Trainer Partners — ${newPlan.name}`, type: 'service' });
                const price = await stripe.prices.create({
                    product: product.id, unit_amount: Math.round(Number(newPlan.price) * 100), currency: 'mxn',
                    recurring: { interval: 'month', interval_count: newPlan.duration_in_months, trial_period_days: MEMBERSHIP_TRIAL_DAYS }
                });
                await MembershipPlan.saveStripeIds(newPlan.id, product.id, price.id);
                stripePriceId = price.id;
            }

            const subscription = await stripe.subscriptions.retrieve(company.membership_stripe_subscription_id);
            const currentItemId = subscription.items.data[0].id;

            await stripe.subscriptions.update(company.membership_stripe_subscription_id, {
                items: [{ id: currentItemId, price: stripePriceId }],
                proration_behavior: 'create_prorations',
                metadata: { ...subscription.metadata, id_plan: newPlan.id }
            });

            await db.none(`UPDATE company SET membership_plan = $2 WHERE id = $1`, [id_company, newPlan.id]);

            return res.status(200).json({ success: true, message: 'Plan actualizado.' });
        } catch (error) {
            console.log(`Error en membershipController.changeMyPlan: ${error}`);
            return res.status(501).json({ success: false, message: 'Error al cambiar de plan', error: error.message });
        }
    },

    // ===================== Complementos (ej. "Flex Ilimitado") =====================
    async getAddons(req, res) {
        try {
            const id_company = req.user.mi_store;
            const [catalog, active] = await Promise.all([
                MembershipAddon.findAll(),
                id_company ? MembershipAddon.findActiveByCompany(id_company) : []
            ]);
            const activeIds = new Set(active.map((a) => a.id_addon));
            const data = catalog.map((a) => ({ ...a, price: Number(a.price), isActive: activeIds.has(a.id) }));
            return res.status(200).json({ success: true, data });
        } catch (error) {
            console.log(`Error en membershipController.getAddons: ${error}`);
            return res.status(501).json({ success: false, message: 'Error al obtener los complementos', error: error.message });
        }
    },

    // NUEVO — Flex Ilimitado (y cualquier complemento futuro) es su PROPIA
    // suscripción de Stripe, con su propia fecha de corte (el día que se
    // activa), NO la misma fecha que el plan base. Sin periodo de gracia
    // — se cobra de inmediato, reutilizando la tarjeta que ya está
    // guardada (no se le pide llenar nada de nuevo): se toma el primer
    // método de pago real del customer y se cobra "fuera de sesión" con
    // payment_behavior:'error_if_incomplete', que hace que Stripe
    // regrese un error real de una vez si la tarjeta es rechazada, en vez
    // de dejar la suscripción a medias en estado "incomplete".
    async activateAddon(req, res) {
        try {
            const id_company = req.user.mi_store;
            const { id_addon } = req.body;
            if (!id_addon) {
                return res.status(400).json({ success: false, message: 'Falta id_addon.' });
            }
            const addon = await MembershipAddon.findById(id_addon);
            if (!addon) {
                return res.status(404).json({ success: false, message: 'Complemento no encontrado.' });
            }
            const company = await User.getCompanyMembershipInfo(id_company);
            if (!company?.membership_stripe_customer_id) {
                return res.status(400).json({ success: false, message: 'Todavía no tienes una cuenta de facturación iniciada.' });
            }

            const methods = await stripe.paymentMethods.list({ customer: company.membership_stripe_customer_id, type: 'card', limit: 1 });
            const paymentMethodId = methods.data[0]?.id;
            if (!paymentMethodId) {
                return res.status(400).json({ success: false, message: 'Agrega primero un método de pago en "Pagos y facturación" antes de activar este complemento.' });
            }

            let stripePriceId = addon.stripe_price_id;
            if (!stripePriceId) {
                const product = await stripe.products.create({ name: addon.name, description: addon.description || '', type: 'service' });
                const price = await stripe.prices.create({
                    product: product.id, unit_amount: Math.round(Number(addon.price) * 100), currency: 'mxn',
                    recurring: { interval: 'month' } // sin trial_period_days a propósito
                });
                await MembershipAddon.saveStripeIds(addon.id, product.id, price.id);
                stripePriceId = price.id;
            }

            const subscription = await stripe.subscriptions.create({
                customer: company.membership_stripe_customer_id,
                items: [{ price: stripePriceId }],
                default_payment_method: paymentMethodId,
                payment_behavior: 'error_if_incomplete',
                collection_method: 'charge_automatically',
                transfer_data: MEMBERSHIP_TRANSFER_DATA,
                metadata: { type: 'membership_addon', id_company: String(id_company), id_addon: addon.id }
            });

            await MembershipAddon.activate(id_company, id_addon, subscription.id);
            return res.status(200).json({ success: true, message: 'Complemento activado y cobrado.' });
        } catch (error) {
            console.log(`Error en membershipController.activateAddon: ${error}`);
            const message = error.type === 'StripeCardError'
                ? `No se pudo cobrar tu tarjeta: ${error.message}`
                : 'Error al activar el complemento';
            return res.status(501).json({ success: false, message, error: error.message });
        }
    },

    async deactivateAddon(req, res) {
        try {
            const id_company = req.user.mi_store;
            const { id_addon } = req.body;
            if (!id_addon) {
                return res.status(400).json({ success: false, message: 'Falta id_addon.' });
            }
            const companyAddon = await MembershipAddon.findCompanyAddon(id_company, id_addon);
            if (!companyAddon) {
                return res.status(404).json({ success: false, message: 'No tienes ese complemento activo.' });
            }
            if (companyAddon.stripe_subscription_id) {
                await stripe.subscriptions.cancel(companyAddon.stripe_subscription_id);
            }
            await MembershipAddon.deactivate(id_company, id_addon);
            return res.status(200).json({ success: true, message: 'Complemento desactivado.' });
        } catch (error) {
            console.log(`Error en membershipController.deactivateAddon: ${error}`);
            return res.status(501).json({ success: false, message: 'Error al desactivar el complemento', error: error.message });
        }
    },

    // ===================== Cancelar membresía de plataforma =====================
    // Cancela al final del periodo ya pagado (cancel_at_period_end) — el
    // entrenador conserva acceso hasta membership_expires_at, no se le
    // corta de golpe algo que ya pagó.
    async cancelMembership(req, res) {
        try {
            const id_company = req.user.mi_store;
            if (!id_company) {
                return res.status(403).json({ success: false, message: 'Tu cuenta no tiene una empresa asignada.' });
            }
            const company = await User.getCompanyMembershipInfo(id_company);
            if (!company?.membership_stripe_subscription_id) {
                return res.status(400).json({ success: false, message: 'No tienes una suscripción activa que cancelar.' });
            }
            await stripe.subscriptions.update(company.membership_stripe_subscription_id, { cancel_at_period_end: true });
            await db.none(`UPDATE company SET membership_status = 'canceling' WHERE id = $1`, [id_company]);
            return res.status(200).json({ success: true, message: 'Tu membresía se cancelará al final de tu periodo actual.' });
        } catch (error) {
            console.log(`Error en membershipController.cancelMembership: ${error}`);
            return res.status(501).json({ success: false, message: 'Error al cancelar tu membresía', error: error.message });
        }
    }

};
