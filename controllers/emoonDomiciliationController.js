// controllers/emoonDomiciliationController.js — puerto 1:1 de
// casaformaDomiciliationController.js.
const EmoonDomiciliation = require('../models/emoonDomiciliation');

module.exports = {
    async getSettings(req, res) {
        try {
            const settings = await EmoonDomiciliation.getSettings();
            return res.status(200).json({ success: true, message: 'OK', data: settings });
        } catch (error) {
            console.log('Error emoon domiciliation.getSettings:', error);
            return res.status(500).json({ success: false, message: 'Error al obtener la configuración.', error: error.message });
        }
    },

    async updateSettings(req, res) {
        try {
            const settings = await EmoonDomiciliation.updateSettings(req.body);
            return res.status(200).json({ success: true, message: 'Configuración de domiciliación actualizada.', data: settings });
        } catch (error) {
            console.log('Error emoon domiciliation.updateSettings:', error);
            return res.status(500).json({ success: false, message: 'Error al actualizar la configuración.', error: error.message });
        }
    },

    async getSubscriptions(req, res) {
        try {
            const list = await EmoonDomiciliation.getAllSubscriptions();
            return res.status(200).json({ success: true, message: 'OK', data: list });
        } catch (error) {
            console.log('Error emoon domiciliation.getSubscriptions:', error);
            return res.status(500).json({ success: false, message: 'Error al obtener las domiciliaciones.', error: error.message });
        }
    },

    async getByUserId(req, res) {
        try {
            const list = await EmoonDomiciliation.getByUserId(req.params.userId);
            return res.status(200).json({ success: true, message: 'OK', data: list });
        } catch (error) {
            console.log('Error emoon domiciliation.getByUserId:', error);
            return res.status(500).json({ success: false, message: 'Error al obtener tu domiciliación.', error: error.message });
        }
    },

    async toggleStatus(req, res) {
        try {
            const sub = await EmoonDomiciliation.toggleStatus(req.params.id, req.body.status);
            if (!sub) {
                return res.status(404).json({ success: false, message: 'Domiciliación no encontrada.' });
            }
            return res.status(200).json({
                success: true,
                message: req.body.status === 'active' ? 'Domiciliación reanudada.' : 'Domiciliación pausada.',
                data: sub
            });
        } catch (error) {
            console.log('Error emoon domiciliation.toggleStatus:', error);
            return res.status(500).json({ success: false, message: 'Error al actualizar la domiciliación.', error: error.message });
        }
    },

    async cancel(req, res) {
        try {
            const ok = await EmoonDomiciliation.cancel(req.params.id);
            if (!ok) {
                return res.status(404).json({ success: false, message: 'Domiciliación no encontrada.' });
            }
            return res.status(200).json({ success: true, message: 'Domiciliación cancelada.' });
        } catch (error) {
            console.log('Error emoon domiciliation.cancel:', error);
            return res.status(500).json({ success: false, message: 'Error al cancelar la domiciliación.', error: error.message });
        }
    }
};
