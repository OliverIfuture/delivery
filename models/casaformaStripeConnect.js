// models/casaformaStripeConnect.js — una sola cuenta Express para todo
// el club (fila única, id = 1). Solo lecturas/escrituras de BD; las
// llamadas reales a la API de Stripe viven en el controller, igual que
// stripeConnectController.js (User solo guarda, nunca llama a Stripe).
const db = require('../config/config');

const CasaformaStripeConnect = {};

CasaformaStripeConnect.getStatus = () => {
    const sql = `SELECT status, stripe_account_id AS account_id, charges_enabled, details_submitted FROM casaforma.casaforma_stripe_connect WHERE id = 1`;
    return db.one(sql);
};

CasaformaStripeConnect.saveAccountId = (accountId) => {
    return db.none(
        `UPDATE casaforma.casaforma_stripe_connect SET stripe_account_id = $1, status = 'pending', updated_at = NOW() WHERE id = 1`,
        [accountId]
    );
};

CasaformaStripeConnect.updateChargesStatus = (chargesEnabled, detailsSubmitted) => {
    return db.none(
        `UPDATE casaforma.casaforma_stripe_connect
         SET charges_enabled = $1, details_submitted = $2,
             status = CASE WHEN $1 THEN 'active' ELSE status END,
             updated_at = NOW()
         WHERE id = 1`,
        [chargesEnabled, detailsSubmitted]
    );
};

module.exports = CasaformaStripeConnect;
