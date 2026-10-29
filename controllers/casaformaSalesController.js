// controllers/casaformaSalesController.js
const CasaformaSale = require('../models/casaformaSale');

module.exports = {
    async createManualSale(req, res) {
        try {
            const { user_id, package_id, payment_method } = req.body;
            const payment = await CasaformaSale.createManualSale(user_id, package_id, payment_method);
            return res.status(201).json({ success: true, message: 'Venta registrada.', data: payment });
        } catch (error) {
            console.log('Error casaforma sales.createManualSale:', error);
            return res.status(400).json({ success: false, message: error.message || 'No se pudo registrar la venta.' });
        }
    }
};
