// controllers/casaformaWebhookTestController.js — TEMPORAL, se borra en
// cuanto se confirme el resultado. Corre DENTRO del proceso de Heroku
// (ahí sí existe STRIPE_WEBHOOK_CASAFORMA_SECRET) para firmar dos
// eventos de Stripe falsos (pago único + domiciliado) con la utilidad
// oficial de prueba de Stripe, y los manda al handler REAL del webhook
// (casaformaWebhookController.handleWebhook) tal cual llegaría uno
// real — firma, parseo y lógica de negocio incluidos. Nunca expone el
// secreto: solo se usa internamente para firmar.
const keys = require('../config/keys.js');
const adminStripe = require('stripe')(keys.stripeAdminSecretKey);
const db = require('../config/config');
const CasaformaPackage = require('../models/casaformaPackage');
const casaformaWebhookController = require('./casaformaWebhookController');

function fakeRes() {
    const res = { _status: 200, _body: null };
    res.status = (code) => { res._status = code; return res; };
    res.json = (body) => { res._body = body; return res; };
    res.send = (body) => { res._body = body; return res; };
    return res;
}

function signedReq(eventObj) {
    const payload = JSON.stringify(eventObj);
    const header = adminStripe.webhooks.generateTestHeaderString({
        payload,
        secret: keys.stripeWebhookCasaformaSecret
    });
    return { headers: { 'stripe-signature': header }, rawBody: Buffer.from(payload, 'utf8') };
}

module.exports = {
    async dryRun(req, res) {
        if (!keys.stripeWebhookCasaformaSecret) {
            return res.status(500).json({ success: false, message: 'STRIPE_WEBHOOK_CASAFORMA_SECRET no está configurado en este entorno.' });
        }

        const results = {};
        let mariana, pkgOneTime, pkgRecurring;

        try {
            mariana = await db.one(`SELECT id FROM casaforma.casaforma_users WHERE email = 'mariana@casaforma.mx'`);
            pkgOneTime = await CasaformaPackage.create({ name: 'TEST Webhook Único', price: 199, credits: 3, type_id: 'class_pack', validity_days: 30, is_active: true });
            pkgRecurring = await CasaformaPackage.create({ name: 'TEST Webhook Domiciliado', price: 499, credits: null, type_id: 'membership', validity_days: 30, is_active: true, is_domiciliado: true, billing_cycle_days: 30 });

            // ===== 1. payment_intent.succeeded (pago único) =====
            const piEvent = {
                id: 'evt_test_pi_' + Date.now(),
                type: 'payment_intent.succeeded',
                account: 'acct_test_fake',
                data: {
                    object: {
                        id: 'pi_test_' + Date.now(),
                        amount_received: Math.round(pkgOneTime.price * 100),
                        metadata: { type: 'casaforma_package_purchase', user_id: String(mariana.id), package_id: String(pkgOneTime.id) }
                    }
                }
            };
            const piReq = signedReq(piEvent);
            const piRes = fakeRes();
            await casaformaWebhookController.handleWebhook(piReq, piRes);
            const paymentRow = await db.oneOrNone(`SELECT * FROM casaforma.casaforma_payments WHERE stripe_payment_intent_id = $1`, [piEvent.data.object.id]);
            const upRow = await db.oneOrNone(`SELECT remaining_classes, status FROM casaforma.casaforma_user_packages WHERE user_id = $1 AND package_id = $2`, [mariana.id, pkgOneTime.id]);
            results.payment_intent_succeeded = {
                webhookHttpStatus: piRes._status,
                webhookBody: piRes._body,
                paymentInsertado: !!paymentRow,
                paymentAmount: paymentRow?.amount,
                userPackage: upRow
            };

            // ===== 2. invoice.payment_succeeded (domiciliado) =====
            const fakeSubId = 'sub_test_' + Date.now();
            const invEvent = {
                id: 'evt_test_inv_' + Date.now(),
                type: 'invoice.payment_succeeded',
                account: 'acct_test_fake',
                data: {
                    object: {
                        id: 'in_test_' + Date.now(),
                        amount_paid: Math.round(pkgRecurring.price * 100),
                        subscription: fakeSubId,
                        metadata: { type: 'casaforma_package_purchase', user_id: String(mariana.id), package_id: String(pkgRecurring.id) }
                    }
                }
            };
            const invReq = signedReq(invEvent);
            const invRes = fakeRes();
            await casaformaWebhookController.handleWebhook(invReq, invRes);
            const paymentRow2 = await db.oneOrNone(`SELECT * FROM casaforma.casaforma_payments WHERE user_id = $1 AND package_id = $2 ORDER BY paid_at DESC LIMIT 1`, [mariana.id, pkgRecurring.id]);
            const domRow = await db.oneOrNone(`SELECT status, stripe_subscription_id, amount FROM casaforma.casaforma_domiciliation_subscriptions WHERE user_id = $1 AND package_id = $2`, [mariana.id, pkgRecurring.id]);
            results.invoice_payment_succeeded = {
                webhookHttpStatus: invRes._status,
                webhookBody: invRes._body,
                paymentInsertado: !!paymentRow2,
                paymentAmount: paymentRow2?.amount,
                domiciliacion: domRow
            };

            return res.status(200).json({ success: true, results });
        } catch (error) {
            return res.status(500).json({ success: false, message: error.message, stack: error.stack, resultsHastaElError: results });
        } finally {
            // Limpieza, pase lo que pase.
            try {
                if (mariana && pkgOneTime) {
                    await db.none(`DELETE FROM casaforma.casaforma_user_packages WHERE user_id = $1 AND package_id = $2`, [mariana.id, pkgOneTime.id]);
                    await db.none(`DELETE FROM casaforma.casaforma_payments WHERE user_id = $1 AND package_id = $2`, [mariana.id, pkgOneTime.id]);
                    await db.none(`DELETE FROM casaforma.casaforma_packages WHERE id = $1`, [pkgOneTime.id]);
                }
                if (mariana && pkgRecurring) {
                    await db.none(`DELETE FROM casaforma.casaforma_domiciliation_subscriptions WHERE user_id = $1 AND package_id = $2`, [mariana.id, pkgRecurring.id]);
                    await db.none(`DELETE FROM casaforma.casaforma_user_packages WHERE user_id = $1 AND package_id = $2`, [mariana.id, pkgRecurring.id]);
                    await db.none(`DELETE FROM casaforma.casaforma_payments WHERE user_id = $1 AND package_id = $2`, [mariana.id, pkgRecurring.id]);
                    await db.none(`DELETE FROM casaforma.casaforma_packages WHERE id = $1`, [pkgRecurring.id]);
                }
            } catch (cleanupErr) {
                console.log('Error en limpieza de dry-run:', cleanupErr.message);
            }
        }
    }
};
