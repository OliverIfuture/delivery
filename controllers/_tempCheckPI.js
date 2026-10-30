// DIAGNÓSTICO TEMPORAL — se borra en el siguiente commit.
const keys = require('../config/keys');
const stripe = require('stripe')(keys.stripeAdminSecretKey);

module.exports = {
    async run(req, res) {
        try {
            const pi = await stripe.paymentIntents.retrieve(req.params.id);
            return res.status(200).json({
                success: true,
                id: pi.id,
                amount: pi.amount,
                transfer_data: pi.transfer_data,
                application_fee_amount: pi.application_fee_amount,
                metadata: pi.metadata
            });
        } catch (error) {
            return res.status(500).json({ success: false, message: error.message });
        }
    }
};
