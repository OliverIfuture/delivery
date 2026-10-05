const db = require('../config/config.js');

const TrainerReferral = {};

TrainerReferral.createPending = (referrerCompanyId, referredCompanyId, referredUserId) => {
    return db.oneOrNone(`
        INSERT INTO trainer_referrals (referrer_company_id, referred_company_id, referred_user_id)
        VALUES ($1, $2, $3)
        ON CONFLICT (referred_company_id) DO NOTHING
        RETURNING *
    `, [referrerCompanyId, referredCompanyId, referredUserId]);
};

TrainerReferral.findByReferred = (referredCompanyId) => {
    return db.oneOrNone(`SELECT * FROM trainer_referrals WHERE referred_company_id = $1`, [referredCompanyId]);
};

// Transición atómica pending -> rewarded: solo la primera llamada gana.
TrainerReferral.claimReward = (referredCompanyId) => {
    return db.oneOrNone(`
        UPDATE trainer_referrals SET status = 'rewarded', rewarded_at = NOW()
        WHERE referred_company_id = $1 AND status = 'pending'
        RETURNING *
    `, [referredCompanyId]);
};

TrainerReferral.releaseReward = (id) => {
    return db.none(`UPDATE trainer_referrals SET status = 'pending', rewarded_at = NULL WHERE id = $1`, [id]);
};

TrainerReferral.statsForReferrer = (referrerCompanyId) => {
    return db.one(`
        SELECT
            COUNT(*)::int AS total,
            COUNT(*) FILTER (WHERE status = 'rewarded')::int AS rewarded,
            COALESCE(SUM(reward_amount) FILTER (WHERE status = 'rewarded'), 0)::numeric AS credits
        FROM trainer_referrals
        WHERE referrer_company_id = $1
    `, [referrerCompanyId]);
};

module.exports = TrainerReferral;
