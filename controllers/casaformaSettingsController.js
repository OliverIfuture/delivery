// controllers/casaformaSettingsController.js
const CasaformaSettings = require('../models/casaformaSettings');

module.exports = {
    async getSettings(req, res) {
        try {
            const settings = await CasaformaSettings.getSettings();
            return res.status(200).json({ success: true, message: 'OK', data: settings });
        } catch (error) {
            console.log('Error casaforma settings.getSettings:', error);
            return res.status(500).json({ success: false, message: 'Error al obtener la configuración.', error: error.message });
        }
    },

    async updateGeneral(req, res) {
        try {
            const data = await CasaformaSettings.updateGeneral(req.body);
            return res.status(200).json({ success: true, message: 'Información general actualizada.', data });
        } catch (error) {
            console.log('Error casaforma settings.updateGeneral:', error);
            return res.status(500).json({ success: false, message: 'Error al actualizar la información general.', error: error.message });
        }
    },

    async updateBooking(req, res) {
        try {
            const data = await CasaformaSettings.updateBooking(req.body);
            return res.status(200).json({ success: true, message: 'Reglas de reserva actualizadas.', data });
        } catch (error) {
            console.log('Error casaforma settings.updateBooking:', error);
            return res.status(500).json({ success: false, message: 'Error al actualizar las reglas de reserva.', error: error.message });
        }
    },

    async updateHours(req, res) {
        try {
            const data = await CasaformaSettings.updateHours(req.body);
            return res.status(200).json({ success: true, message: 'Horario actualizado.', data });
        } catch (error) {
            console.log('Error casaforma settings.updateHours:', error);
            return res.status(500).json({ success: false, message: 'Error al actualizar el horario.', error: error.message });
        }
    },

    async getBillingStatus(req, res) {
        try {
            const data = await CasaformaSettings.getBillingStatus();
            return res.status(200).json({ success: true, message: 'OK', data });
        } catch (error) {
            console.log('Error casaforma settings.getBillingStatus:', error);
            return res.status(500).json({ success: false, message: 'Error al obtener el estado de cobro.', error: error.message });
        }
    },

    async updateBillingStatus(req, res) {
        try {
            const data = await CasaformaSettings.updateBillingStatus(req.body.status, req.body.period);
            return res.status(200).json({ success: true, message: 'Estado de cobro actualizado.', data });
        } catch (error) {
            console.log('Error casaforma settings.updateBillingStatus:', error);
            return res.status(500).json({ success: false, message: 'Error al actualizar el estado de cobro.', error: error.message });
        }
    }
};
