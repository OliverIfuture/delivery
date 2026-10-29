// controllers/casaformaWebhookTestController.js — TEMPORAL, se borra en
// cuanto se confirme el resultado. Prueba la rama nueva
// 'casaforma_admin_billing_monthly' del webhook real. Guarda el estado
// real de casaforma_settings antes de tocarlo y lo restaura exacto al
// terminar (pase lo que pase).
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
        const original = await db.one(`SELECT * FROM casaforma.casaforma_settings WHERE id = 1`);

        try {
            await db.none(`UPDATE casaforma.casaforma_settings SET admin_billing_status = 'pending', admin_billing_period = NULL WHERE id = 1`);
            const before = await db.one(`SELECT admin_billing_status, admin_billing_period, admin_billing_paid_at FROM casaforma.casaforma_settings WHERE id = 1`);

            const piEvent = {
                id: 'evt_test_billing_' + Date.now(),
                type: 'payment_intent.succeeded',
                data: {
                    object: {
                        id: 'pi_test_billing_' + Date.now(),
                        created: Math.floor(Date.now() / 1000),
                        amount_received: 40500,
                        metadata: { type: 'casaforma_admin_billing_monthly', concepto_servidor: '330', concepto_correo: '75', due_day: '20' }
                    }
                }
            };
            // Firmamos con el secreto que SÍ existe ya (el de "Cuentas
            // conectadas") — para esta prueba de lógica no importa cuál
            // de los dos secretos es, constructEvent solo valida que la
            // firma calce con ALGUNO de los que el código intenta.
            const piReq = signedReq(piEvent, keys.stripeWebhookCasaformaSecret);
            const piRes = fakeRes();
            await casaformaWebhookController.handleWebhook(piReq, piRes);

            const after = await db.one(`SELECT admin_billing_status, admin_billing_period, admin_billing_paid_at FROM casaforma.casaforma_settings WHERE id = 1`);

            return res.status(200).json({
                success: true,
                webhookHttpStatus: piRes._status,
                webhookBody: piRes._body,
                before,
                after
            });
        } catch (error) {
            return res.status(500).json({ success: false, message: error.message, stack: error.stack });
        } finally {
            // Restaura EXACTO lo que había antes de la prueba, pase lo que pase.
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
