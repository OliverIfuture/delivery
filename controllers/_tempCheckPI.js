// DIAGNÓSTICO TEMPORAL — se borra en el siguiente commit.
const keys = require('../config/keys');
const stripe = require('stripe')(keys.stripeAdminSecretKey);

module.exports = {
    async run(req, res) {
        try {
            let subId = req.params.id;
            if (subId.includes('@')) {
                const customers = await stripe.customers.list({ email: subId, limit: 1 });
                if (!customers.data.length) return res.status(404).json({ success: false, message: 'customer not found' });
                const subs = await stripe.subscriptions.list({ customer: customers.data[0].id, limit: 1 });
                if (!subs.data.length) return res.status(404).json({ success: false, message: 'subscription not found' });
                subId = subs.data[0].id;
            }
            const sub = await stripe.subscriptions.retrieve(subId, { expand: ['latest_invoice.payment_intent', 'latest_invoice.charge'] });
            return res.status(200).json({
                success: true,
                subId: sub.id,
                subMetadata: sub.metadata,
                subTransferData: sub.transfer_data,
                subApplicationFeePercent: sub.application_fee_percent,
                invoiceId: sub.latest_invoice?.id,
                invoiceMetadata: sub.latest_invoice?.metadata,
                invoiceTransferData: sub.latest_invoice?.transfer_data,
                invoiceApplicationFeeAmount: sub.latest_invoice?.application_fee_amount,
                paymentIntent: sub.latest_invoice?.payment_intent ? {
                    id: sub.latest_invoice.payment_intent.id,
                    transfer_data: sub.latest_invoice.payment_intent.transfer_data,
                    application_fee_amount: sub.latest_invoice.payment_intent.application_fee_amount,
                    metadata: sub.latest_invoice.payment_intent.metadata
                } : null
            });
        } catch (error) {
            return res.status(500).json({ success: false, message: error.message });
        }
    }
};
