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
const storage = require('../utils/cloud_storage.js');
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
    async getMyMembershipStatus(req, res) {
        try {
            const id_company = req.user.mi_store;
            if (!id_company) {
                return res.status(403).json({ success: false, message: 'Tu cuenta no tiene una empresa asignada.' });
            }
            const company = await User.getCompanyMembershipInfo(id_company);
            const plan = company?.membership_plan ? await MembershipPlan.findById(company.membership_plan) : null;
            const clients = await User.getClientsByCompany(id_company);
            const clientCount = clients.length;
            const clientLimit = plan ? Number(plan.client_limit) : null;

            const now = new Date();
            const expiresAt = company?.membership_expires_at ? new Date(company.membership_expires_at) : null;
            const isExpired = !!expiresAt && expiresAt.getTime() < now.getTime();
            const daysUntilExpiry = expiresAt ? Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : null;

            return res.status(200).json({
                success: true,
                data: {
                    plan: plan ? { id: plan.id, name: plan.name, price: Number(plan.price), clientLimit } : null,
                    status: company?.membership_status || 'inactive',
                    expiresAt: company?.membership_expires_at || null,
                    isExpired,
                    daysUntilExpiry,
                    clientCount,
                    clientLimit,
                    isOverClientLimit: clientLimit != null && clientCount >= clientLimit
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
                    recurring: { interval: 'month', interval_count: newPlan.duration_in_months }
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

    // Se cobra en la MISMA suscripción/fecha que el plan base — se agrega
    // como un segundo item dentro de la misma suscripción de Stripe.
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
            if (!company?.membership_stripe_subscription_id) {
                return res.status(400).json({ success: false, message: 'Todavía no tienes una suscripción activa.' });
            }

            let stripePriceId = addon.stripe_price_id;
            if (!stripePriceId) {
                const product = await stripe.products.create({ name: addon.name, description: addon.description || '', type: 'service' });
                const price = await stripe.prices.create({
                    product: product.id, unit_amount: Math.round(Number(addon.price) * 100), currency: 'mxn',
                    recurring: { interval: 'month' }
                });
                await MembershipAddon.saveStripeIds(addon.id, product.id, price.id);
                stripePriceId = price.id;
            }

            const item = await stripe.subscriptionItems.create({
                subscription: company.membership_stripe_subscription_id,
                price: stripePriceId,
                proration_behavior: 'create_prorations'
            });

            await MembershipAddon.activate(id_company, id_addon, item.id);
            return res.status(200).json({ success: true, message: 'Complemento activado.' });
        } catch (error) {
            console.log(`Error en membershipController.activateAddon: ${error}`);
            return res.status(501).json({ success: false, message: 'Error al activar el complemento', error: error.message });
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
            if (companyAddon.stripe_subscription_item_id) {
                await stripe.subscriptionItems.del(companyAddon.stripe_subscription_item_id, { proration_behavior: 'create_prorations' });
            }
            await MembershipAddon.deactivate(id_company, id_addon);
            return res.status(200).json({ success: true, message: 'Complemento desactivado.' });
        } catch (error) {
            console.log(`Error en membershipController.deactivateAddon: ${error}`);
            return res.status(501).json({ success: false, message: 'Error al desactivar el complemento', error: error.message });
        }
    }

};
