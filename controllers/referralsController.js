// controllers/referralsController.js
//
// Programa "Invita y gana": cada entrenador tiene un código (TP + id de
// empresa en base36). Cuando alguien se registra con ese código queda un
// referido 'pending'; al confirmarse su primer pago se le da al referidor
// un crédito de $250 MXN como saldo en Stripe (Stripe lo descuenta solo de
// su próxima factura de plataforma).
const db = require('../config/config.js');
const keys = require('../config/keys.js');
const stripe = require('stripe')(keys.stripeAdminSecretKey);
const TrainerReferral = require('../models/trainerReferral.js');
const { encodeReferralCode, decodeReferralCode } = require('../utils/referralCode.js');

const REWARD_MXN = 250;

module.exports = {

    async getMyReferrals(req, res) {
        try {
            const id_company = req.user.mi_store;
            if (!id_company || String(id_company) === '0') {
                return res.status(403).json({ success: false, message: 'Tu cuenta no tiene una empresa asignada.' });
            }
            const stats = await TrainerReferral.statsForReferrer(id_company);
            return res.status(200).json({
                success: true,
                data: {
                    code: encodeReferralCode(id_company),
                    reward_amount: REWARD_MXN,
                    total: stats.total,
                    rewarded: stats.rewarded,
                    credits: Number(stats.credits)
                }
            });
        } catch (error) {
            console.log(`Error en referralsController.getMyReferrals: ${error}`);
            return res.status(501).json({ success: false, message: 'Error al obtener tus referidos' });
        }
    },

    // Llamado desde el registro de entrenador. Nunca falla el registro: si el
    // código no es válido o es propio, simplemente no se atribuye nada.
    async attachFromRegistration({ referredUserId, code }) {
        const referrerId = decodeReferralCode(code);
        if (!referrerId) return null;
        const referred = await db.oneOrNone(`SELECT id FROM company WHERE user_id = $1 ORDER BY id DESC LIMIT 1`, [referredUserId]);
        if (!referred) return null;
        if (Number(referred.id) === referrerId) return null;
        const referrer = await db.oneOrNone(`SELECT id FROM company WHERE id = $1`, [referrerId]);
        if (!referrer) return null;
        return TrainerReferral.createPending(referrerId, referred.id, referredUserId);
    },

    // Llamado cuando la empresa referida ya pagó de verdad. Idempotente.
    async rewardIfPaid(referredCompanyId) {
        const pending = await TrainerReferral.findByReferred(referredCompanyId);
        if (!pending || pending.status !== 'pending') return;

        const claimed = await TrainerReferral.claimReward(referredCompanyId);
        if (!claimed) return;

        try {
            const referrer = await db.oneOrNone(`SELECT membership_stripe_customer_id FROM company WHERE id = $1`, [claimed.referrer_company_id]);
            const customerId = referrer?.membership_stripe_customer_id;
            if (!customerId) {
                await TrainerReferral.releaseReward(claimed.id);
                return;
            }
            await stripe.customers.createBalanceTransaction(
                customerId,
                {
                    amount: -Math.round(Number(claimed.reward_amount) * 100),
                    currency: 'mxn',
                    description: `Recompensa por referido (empresa ${referredCompanyId})`
                },
                { idempotencyKey: `referral-reward-${claimed.id}` }
            );
        } catch (error) {
            await TrainerReferral.releaseReward(claimed.id);
            throw error;
        }
    }
};
