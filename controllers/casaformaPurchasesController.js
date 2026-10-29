// controllers/casaformaPurchasesController.js
const CasaformaPurchase = require('../models/casaformaPurchase');

module.exports = {
    async getByUserId(req, res) {
        try {
            const list = await CasaformaPurchase.getByUserId(req.params.userId);
            return res.status(200).json({ success: true, message: 'OK', data: list });
        } catch (error) {
            console.log('Error casaforma purchases.getByUserId:', error);
            return res.status(500).json({ success: false, message: 'Error al obtener el historial de compras.', error: error.message });
        }
    },

    async getAll(req, res) {
        try {
            const list = await CasaformaPurchase.getAllAdmin();
            return res.status(200).json({ success: true, message: 'OK', data: list });
        } catch (error) {
            console.log('Error casaforma purchases.getAll:', error);
            return res.status(500).json({ success: false, message: 'Error al obtener los pagos.', error: error.message });
        }
    }
};
