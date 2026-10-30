// controllers/_tempEmoonDomTest.js — DIAGNÓSTICO TEMPORAL, se borra en el
// siguiente commit. Construye y firma eventos sintéticos de Stripe
// (invoice.payment_succeeded, invoice.payment_failed,
// customer.subscription.deleted) con metadata de prueba, y los manda al
// webhook real para confirmar que los branches nuevos de domiciliación
// de Emoon funcionan, sin necesidad de imprimir ninguna llave.
const keys = require('../config/keys');
const stripe = require('stripe')(keys.stripeAdminSecretKey);
const axios = require('axios');

function sign(payloadObj) {
    const payload = JSON.stringify(payloadObj);
    const header = stripe.webhooks.generateTestHeaderString({ payload, secret: keys.stripeWebhookSecret });
    return { payload, header };
}

module.exports = {
    async run(req, res) {
        try {
            const { userId, packageId, fakeSubId } = req.body;
            const results = {};

            // 1. invoice.payment_succeeded
            const evt1 = {
                id: 'evt_test_1', type: 'invoice.payment_succeeded',
                data: { object: {
                    id: 'in_test_1', subscription: fakeSubId, amount_paid: 15000,
                    metadata: { type: 'emoon_domiciliado_purchase', user_id: userId, package_id: packageId }
                } }
            };
            const { payload: p1, header: h1 } = sign(evt1);
            const r1 = await axios.post('https://deliveryserver.herokuapp.com/api/subscriptions/webhook', p1, {
                headers: { 'Content-Type': 'application/json', 'Stripe-Signature': h1 }
            });
            results.paymentSucceeded = r1.data;

            // 2. invoice.payment_failed
            const evt2 = {
                id: 'evt_test_2', type: 'invoice.payment_failed',
                data: { object: { id: 'in_test_2', subscription: fakeSubId } }
            };
            const { payload: p2, header: h2 } = sign(evt2);
            const r2 = await axios.post('https://deliveryserver.herokuapp.com/api/subscriptions/webhook', p2, {
                headers: { 'Content-Type': 'application/json', 'Stripe-Signature': h2 }
            });
            results.paymentFailed = r2.data;

            // 3. customer.subscription.deleted
            const evt3 = {
                id: 'evt_test_3', type: 'customer.subscription.deleted',
                data: { object: { id: fakeSubId } }
            };
            const { payload: p3, header: h3 } = sign(evt3);
            const r3 = await axios.post('https://deliveryserver.herokuapp.com/api/subscriptions/webhook', p3, {
                headers: { 'Content-Type': 'application/json', 'Stripe-Signature': h3 }
            });
            results.subscriptionDeleted = r3.data;

            return res.status(200).json({ success: true, results });
        } catch (error) {
            return res.status(500).json({ success: false, message: error.message, stack: error.stack });
        }
    }
};
