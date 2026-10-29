// models/casaformaStripeConnect.js — una sola cuenta Express para todo
// el club (fila única, id = 1). El ciclo not_connected -> pending ->
// active sigue simulado (no hay integración real con Stripe Connect
// todavía) pero ahora vive en el servidor, no en el navegador.
const db = require('../config/config');

const CasaformaStripeConnect = {};

CasaformaStripeConnect.getStatus = () => {
    const sql = `SELECT status, stripe_account_id AS account_id, charges_enabled, details_submitted FROM casaforma.casaforma_stripe_connect WHERE id = 1`;
    return db.one(sql);
};

CasaformaStripeConnect.startOnboarding = async () => {
    const accountId = `acct_mock_${Date.now()}`;
    await db.none(
        `UPDATE casaforma.casaforma_stripe_connect SET status = 'pending', stripe_account_id = $1, updated_at = NOW() WHERE id = 1`,
        [accountId]
    );
    return CasaformaStripeConnect.getStatus();
};

CasaformaStripeConnect.refreshStatus = async () => {
    await db.none(
        `UPDATE casaforma.casaforma_stripe_connect
         SET status = CASE WHEN status = 'pending' THEN 'active' ELSE status END,
             charges_enabled = CASE WHEN status = 'pending' THEN true ELSE charges_enabled END,
             details_submitted = CASE WHEN status = 'pending' THEN true ELSE details_submitted END,
             updated_at = NOW()
         WHERE id = 1`
    );
    return CasaformaStripeConnect.getStatus();
};

module.exports = CasaformaStripeConnect;
