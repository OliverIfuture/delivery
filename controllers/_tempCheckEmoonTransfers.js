// controllers/_tempCheckEmoonTransfers.js — DIAGNÓSTICO TEMPORAL, se
// borra en el siguiente commit. Verifica contra la API real de Stripe
// si la cuenta conectada de Emoon (acct_1UC7CZFbEbeuW30V) ya tiene
// transferencias/cargos reales, para confirmar o descartar si el pago
// de paquetes ya está enrutado ahí.
const keys = require('../config/keys');
const stripe = require('stripe')(keys.stripeAdminSecretKey);

module.exports = {
    async run(req, res) {
        try {
            const accountId = 'acct_1UC7CZFbEbeuW30V';

            const balance = await stripe.balance.retrieve({ stripeAccount: accountId });
            const charges = await stripe.charges.list({ limit: 10 }, { stripeAccount: accountId });
            const transfers = await stripe.transfers.list({ destination: accountId, limit: 10 });
            const payouts = await stripe.payouts.list({ limit: 5 }, { stripeAccount: accountId });

            return res.status(200).json({
                success: true,
                balance: balance,
                chargesOnConnectedAccount: charges.data.map(c => ({ id: c.id, amount: c.amount, created: c.created, description: c.description, metadata: c.metadata })),
                transfersFromMainToConnected: transfers.data.map(t => ({ id: t.id, amount: t.amount, created: t.created, description: t.description })),
                payoutsFromConnectedAccount: payouts.data.map(p => ({ id: p.id, amount: p.amount, created: p.created, status: p.status }))
            });
        } catch (error) {
            return res.status(500).json({ success: false, message: error.message, stack: error.stack });
        }
    }
};
