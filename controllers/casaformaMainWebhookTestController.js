// controllers/casaformaMainWebhookTestController.js — TEMPORAL, se
// borra en cuanto se confirme el resultado. A diferencia de la prueba
// anterior (que firmó con stripeWebhookCasaformaSecret, el de "Cuentas
// conectadas"), esta firma específicamente con
// stripeWebhookCasaformaMainSecret (el nuevo, "Tu cuenta") para probar
// que ESE secreto en particular ya está cargado y funciona — no basta
// con que el otro ya funcionara antes.
const keys = require('../config/keys.js');
const adminStripe = require('stripe')(keys.stripeAdminSecretKey);
const db = require('../config/config');
const casaformaWebhookController = require('./casaformaWebhookController');

function fakeRes() {
    const res = { _status: 200, _body: null };
    res.status = (code) => { res._status = code; return res; };
    res.json = (body) => { res._body = body; return res; };
    res.send = (body) => { res._body = body; return res; };
    return res;
}

function signedReq(eventObj, secret) {
    const payload = JSON.stringify(eventObj);
    const header = adminStripe.webhooks.generateTestHeaderString({ payload, secret });
    return { headers: { 'stripe-signature': header }, rawBody: Buffer.from(payload, 'utf8') };
}

module.exports = {
    async dryRun(req, res) {
        if (!keys.stripeWebhookCasaformaMainSecret) {
            return res.status(200).json({ success: false, message: 'STRIPE_WEBHOOK_CASAFORMA_MAIN_SECRET todavía no está cargado en este dyno.' });
        }

        const original = await db.one(`SELECT * FROM casaforma.casaforma_settings WHERE id = 1`);

        try {
            await db.none(`UPDATE casaforma.casaforma_settings SET admin_billing_status = 'pending', admin_billing_period = NULL WHERE id = 1`);
            const before = await db.one(`SELECT admin_billing_status, admin_billing_period FROM casaforma.casaforma_settings WHERE id = 1`);

            const piEvent = {
                id: 'evt_test_mainsecret_' + Date.now(),
                type: 'payment_intent.succeeded',
                data: {
                    object: {
                        id: 'pi_test_mainsecret_' + Date.now(),
                        created: Math.floor(Date.now() / 1000),
                        amount_received: 40500,
                        metadata: { type: 'casaforma_admin_billing_monthly', concepto_servidor: '330', concepto_correo: '75', due_day: '20' }
                    }
                }
            };
            // Firmado ESPECÍFICAMENTE con el secreto nuevo de "Tu cuenta" —
            // si este secreto no estuviera bien cargado, constructEvent
            // fallaría con los dos intentos y esto tronaría.
            const piReq = signedReq(piEvent, keys.stripeWebhookCasaformaMainSecret);
            const piRes = fakeRes();
            await casaformaWebhookController.handleWebhook(piReq, piRes);

            const after = await db.one(`SELECT admin_billing_status, admin_billing_period FROM casaforma.casaforma_settings WHERE id = 1`);

            return res.status(200).json({ success: true, firmadoCon: 'STRIPE_WEBHOOK_CASAFORMA_MAIN_SECRET', webhookHttpStatus: piRes._status, webhookBody: piRes._body, before, after });
        } catch (error) {
            return res.status(500).json({ success: false, message: error.message });
        } finally {
            await db.none(
                `UPDATE casaforma.casaforma_settings
                 SET admin_billing_status = $1, admin_billing_period = $2,
                     admin_billing_last_updated_at = $3, admin_billing_paid_at = $4, admin_billing_dismissed_at = $5
                 WHERE id = 1`,
                [original.admin_billing_status, original.admin_billing_period, original.admin_billing_last_updated_at, original.admin_billing_paid_at, original.admin_billing_dismissed_at]
            );
        }
    }
};
