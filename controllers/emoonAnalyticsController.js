// controllers/emoonAnalyticsController.js
const EmoonAnalytics = require('../models/emoonAnalytics');

module.exports = {
    async getSummary(req, res) {
        try {
            const data = await EmoonAnalytics.getSummary();
            return res.status(200).json({ success: true, data });
        } catch (error) {
            console.error('Error getAnalyticsSummary:', error);
            return res.status(500).json({ success: false, message: 'Error al obtener métricas', error: error.message });
        }
    }
};