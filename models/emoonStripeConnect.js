// models/emoonStripeConnect.js — puerto 1:1 de casaformaStripeConnect.js.
// Una sola cuenta Express para todo el estudio (fila única, id = 1).
// Solo lecturas/escrituras de BD; las llamadas reales a la API de
// Stripe viven en el controller.
const db = require('../config/config');

const EmoonStripeConnect = {};

EmoonStripeConnect.getStatus = () => {
    const sql = `SELECT status, stripe_account_id AS account_id, charges_enabled, details_submitted FROM emoon.emoon_stripe_connect WHERE id = 1`;
    return db.one(sql);
};

EmoonStripeConnect.saveAccountId = (accountId) => {
    return db.none(
        `UPDATE emoon.emoon_stripe_connect SET stripe_account_id = $1, status = 'pending', updated_at = NOW() WHERE id = 1`,
        [accountId]
    );
};

EmoonStripeConnect.updateChargesStatus = (chargesEnabled, detailsSubmitted) => {
    return db.none(
        `UPDATE emoon.emoon_stripe_connect
         SET charges_enabled = $1, details_submitted = $2,
             status = CASE WHEN $1 THEN 'active' ELSE status END,
             updated_at = NOW()
         WHERE id = 1`,
        [chargesEnabled, detailsSubmitted]
    );
};

module.exports = EmoonStripeConnect;
