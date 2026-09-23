// controllers/membershipController.js
//
// NUEVO — cobro REAL (pago único, por ahora) de la membresía de
// plataforma que un entrenador nuevo elige al registrarse (ver
// RegisterTrainerFlow.vue del frontend, paso 4/5). Va directo a la
// cuenta de Stripe de LA PLATAFORMA (keys.stripeAdminSecretKey, sin
// { stripeAccount } de Connect) — a diferencia de COBI, que cobra a
// nombre de cada entrenador con su propia cuenta conectada, aquí el
// dinero es ingreso nuestro, no del entrenador.
const keys = require('../config/keys.js');
const db = require('../config/config.js');
const MembershipPlan = require('../models/membershipPlan.js');
const stripe = require('stripe')(keys.stripeAdminSecretKey);

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

    // Crea (la primera vez) el Product/Price real del plan en Stripe, y un
    // PaymentIntent de pago único por ese plan para una compañía que YA
    // se acaba de crear (ver flujo de registro: primero se crea la cuenta
    // con el endpoint ya existente, luego se cobra aquí).
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
                    currency: 'mxn'
                });
                await MembershipPlan.saveStripeIds(plan.id, product.id, price.id);
                stripePriceId = price.id;
            }

            const paymentIntent = await stripe.paymentIntents.create({
                amount: Math.round(Number(plan.price) * 100),
                currency: 'mxn',
                automatic_payment_methods: { enabled: true },
                metadata: {
                    type: 'membership_payment',
                    id_company: String(id_company),
                    id_plan: plan.id
                }
            });

            return res.status(200).json({
                success: true,
                data: {
                    clientSecret: paymentIntent.client_secret,
                    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || ''
                }
            });
        } catch (error) {
            console.log(`Error en membershipController.createCheckout: ${error}`);
            return res.status(501).json({ success: false, message: 'Error al iniciar el cobro', error: error.message });
        }
    },

    // Verifica DE VERDAD con Stripe (nunca confía en lo que mande el
    // cliente) que el PaymentIntent se completó y corresponde a esta
    // compañía/plan, y activa la membresía real — esto es lo que
    // reemplaza el 'fundador' fijo que createWithImageUserAndCompany deja
    // por defecto al crear la cuenta.
    async confirmPayment(req, res) {
        try {
            const id_company = req.user.mi_store;
            const { id_plan, payment_intent_id } = req.body;
            if (!id_company) {
                return res.status(403).json({ success: false, message: 'Tu cuenta no tiene una empresa asignada.' });
            }
            if (!id_plan || !payment_intent_id) {
                return res.status(400).json({ success: false, message: 'Faltan datos para confirmar el pago.' });
            }
            const plan = await MembershipPlan.findById(id_plan);
            if (!plan) {
                return res.status(404).json({ success: false, message: 'Plan no encontrado.' });
            }

            const intent = await stripe.paymentIntents.retrieve(payment_intent_id);
            if (intent.status !== 'succeeded') {
                return res.status(400).json({ success: false, message: 'El pago todavía no se ha completado.' });
            }
            if (intent.metadata?.id_company !== String(id_company) || intent.metadata?.id_plan !== plan.id) {
                return res.status(400).json({ success: false, message: 'El pago no corresponde a esta compañía o plan.' });
            }

            const expiresAt = new Date();
            expiresAt.setMonth(expiresAt.getMonth() + plan.duration_in_months);

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
