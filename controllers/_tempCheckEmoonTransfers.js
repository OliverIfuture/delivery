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

            const transfers = await stripe.transfers.list({ destination: accountId, limit: 5 });
            const detailed = [];
            for (const t of transfers.data) {
                const full = await stripe.transfers.retrieve(t.id);
                let sourceTx = null;
                if (full.source_transaction) {
                    try {
                        const ch = await stripe.charges.retrieve(full.source_transaction);
                        sourceTx = { id: ch.id, amount: ch.amount, payment_intent: ch.payment_intent, metadata: ch.metadata, description: ch.description, application_fee_amount: ch.application_fee_amount };
                    } catch (e) {
                        sourceTx = { error: e.message };
                    }
                }
                detailed.push({
                    transferId: full.id,
                    amount: full.amount,
                    created: full.created,
                    transfer_group: full.transfer_group,
                    source_transaction: full.source_transaction,
                    sourceTx
                });
            }

            return res.status(200).json({ success: true, detailed });
        } catch (error) {
            return res.status(500).json({ success: false, message: error.message, stack: error.stack });
        }
    }
};
