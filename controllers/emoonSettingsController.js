// controllers/emoonSettingsController.js
const EmoonSettings = require('../models/emoonSettings');

module.exports = {
    // Obtener
    async getSettings(req, res) {
        try {
            const settings = await EmoonSettings.getSettings();
            return res.status(200).json({
                success: true,
                message: 'Configuración obtenida correctamente.',
                data: settings
            });
        } catch (error) {
            console.log('Error en getSettings:', error);
            return res.status(500).json({ success: false, message: 'Error interno.', error: error.message });
        }
    },

    // Actualizar General
    async updateGeneral(req, res) {
        try {
            const result = await EmoonSettings.updateGeneral(req.body);
            return res.status(200).json({ success: true, message: 'Información general guardada.', data: result });
        } catch (error) {
            return res.status(500).json({ success: false, message: 'Error al guardar.', error: error.message });
        }
    },

    // Actualizar Reservas
    async updateBooking(req, res) {
        try {
            const result = await EmoonSettings.updateBooking(req.body);
            return res.status(200).json({ success: true, message: 'Políticas de reserva guardadas.', data: result });
        } catch (error) {
            return res.status(500).json({ success: false, message: 'Error al guardar.', error: error.message });
        }
    },

    // Actualizar Horarios
    async updateHours(req, res) {
        try {
            const result = await EmoonSettings.updateHours(req.body);
            return res.status(200).json({ success: true, message: 'Horarios guardados.', data: result });
        } catch (error) {
            return res.status(500).json({ success: false, message: 'Error al guardar.', error: error.message });
        }
    }
};