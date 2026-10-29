// controllers/casaformaAnalyticsController.js
const CasaformaAnalytics = require('../models/casaformaAnalytics');

module.exports = {
    async getSummary(req, res) {
        try {
            const summary = await CasaformaAnalytics.getSummary();
            return res.status(200).json({ success: true, message: 'OK', data: summary });
        } catch (error) {
            console.log('Error casaforma analytics.getSummary:', error);
            return res.status(500).json({ success: false, message: 'Error al obtener el resumen.', error: error.message });
        }
    }
};
