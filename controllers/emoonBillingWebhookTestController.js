// controllers/emoonBillingWebhookTestController.js — TEMPORAL, se borra
// en cuanto se confirme el resultado. Prueba el fix de
// clientSubscriptionsController.js (case 'emoon_admin_monthly_service')
// contra el webhook real. Guarda y restaura el estado real exacto.
const keys = require('../config/keys.js');
const adminStripe = require('stripe')(keys.stripeAdminSecretKey);
const db = require('../config/config');
const clientSubscriptionsController = require('./clientSubscriptionsController');

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
        const original = await db.one(`SELECT * FROM emoon.emoon_settings WHERE id = 1`);

        try {
            await db.none(`UPDATE emoon.emoon_settings SET admin_billing_status = 'pending', admin_billing_period = NULL WHERE id = 1`);
            const before = await db.one(`SELECT admin_billing_status, admin_billing_period, admin_billing_paid_at FROM emoon.emoon_settings WHERE id = 1`);

            const piEvent = {
                id: 'evt_test_emoon_billing_' + Date.now(),
                type: 'payment_intent.succeeded',
                data: {
                    object: {
                        id: 'pi_test_emoon_billing_' + Date.now(),
                        created: Math.floor(Date.now() / 1000),
                        amount: 50600,
                        customer: null,
                        metadata: { type: 'emoon_admin_monthly_service', item_name: 'Hosting profesional + Server controller', due_day: '20' }
                    }
                }
            };
            const piReq = signedReq(piEvent, keys.stripeWebhookSecret);
            const piRes = fakeRes();
            await clientSubscriptionsController.stripeWebhook(piReq, piRes, () => {});

            const after = await db.one(`SELECT admin_billing_status, admin_billing_period, admin_billing_paid_at FROM emoon.emoon_settings WHERE id = 1`);

            return res.status(200).json({ success: true, webhookHttpStatus: piRes._status, webhookBody: piRes._body, before, after });
        } catch (error) {
            return res.status(500).json({ success: false, message: error.message, stack: error.stack });
        } finally {
            await db.none(
                `UPDATE emoon.emoon_settings
                 SET admin_billing_status = $1, admin_billing_period = $2,
                     admin_billing_last_updated_at = $3, admin_billing_paid_at = $4, admin_billing_dismissed_at = $5
                 WHERE id = 1`,
                [original.admin_billing_status, original.admin_billing_period, original.admin_billing_last_updated_at, original.admin_billing_paid_at, original.admin_billing_dismissed_at]
            );
        }
    }
};
