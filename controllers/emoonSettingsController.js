// controllers/emoonSettingsController.js
const EmoonSettings = require('../models/emoonSettings');

// Identificador del ciclo de cobro administrativo actual, formato 'YYYY-MM'.
const getCurrentBillingPeriod = () => new Date().toISOString().slice(0, 7);

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
    },

    async getBillingStatus(req, res) {
        try {
            const result = await EmoonSettings.getBillingStatus();
            const currentPeriod = getCurrentBillingPeriod();

            // Si el estado guardado pertenece a un ciclo (mes) anterior, para el
            // ciclo actual se considera 'pending' aunque en BD siga como 'paid'/'dismissed'.
            const isCurrentCycle = !!result && result.admin_billing_period === currentPeriod;
            const effectiveStatus = isCurrentCycle ? (result.admin_billing_status || 'pending') : 'pending';

            return res.status(200).json({
                success: true,
                message: 'Estado del cobro administrativo consultado.',
                data: {
                    admin_billing_status: effectiveStatus,
                    admin_billing_period: currentPeriod,
                    admin_billing_last_updated_at: result ? result.admin_billing_last_updated_at : null,
                    admin_billing_paid_at: isCurrentCycle ? result.admin_billing_paid_at : null,
                    admin_billing_dismissed_at: isCurrentCycle ? result.admin_billing_dismissed_at : null
                }
            });
        } catch (error) {
            return res.status(500).json({ success: false, message: 'Error al consultar el estado.', error: error.message });
        }
    },

    async updateBillingStatus(req, res) {
        try {
            const { status } = req.body || {};
            if (!status) {
                return res.status(400).json({ success: false, message: 'Falta el estado deseado.' });
            }
            const currentPeriod = getCurrentBillingPeriod();
            const result = await EmoonSettings.updateBillingStatus(status, currentPeriod);
            return res.status(200).json({ success: true, message: 'Estado del cobro administrativo actualizado.', data: result });
        } catch (error) {
            return res.status(500).json({ success: false, message: 'Error al actualizar el estado.', error: error.message });
        }
    }
};