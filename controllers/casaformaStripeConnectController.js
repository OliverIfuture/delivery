// controllers/casaformaStripeConnectController.js
const CasaformaStripeConnect = require('../models/casaformaStripeConnect');

module.exports = {
    async getStatus(req, res) {
        try {
            const status = await CasaformaStripeConnect.getStatus();
            return res.status(200).json({ success: true, message: 'OK', data: status });
        } catch (error) {
            console.log('Error casaforma stripe-connect.getStatus:', error);
            return res.status(500).json({ success: false, message: 'Error al obtener el estado de Stripe.', error: error.message });
        }
    },

    async startOnboarding(req, res) {
        try {
            const status = await CasaformaStripeConnect.startOnboarding();
            return res.status(200).json({ success: true, message: 'Te enviamos a completar tu registro en Stripe.', data: status });
        } catch (error) {
            console.log('Error casaforma stripe-connect.startOnboarding:', error);
            return res.status(500).json({ success: false, message: 'Error al iniciar el registro en Stripe.', error: error.message });
        }
    },

    async refreshStatus(req, res) {
        try {
            const status = await CasaformaStripeConnect.refreshStatus();
            return res.status(200).json({ success: true, message: 'OK', data: status });
        } catch (error) {
            console.log('Error casaforma stripe-connect.refreshStatus:', error);
            return res.status(500).json({ success: false, message: 'Error al actualizar el estado.', error: error.message });
        }
    }
};
