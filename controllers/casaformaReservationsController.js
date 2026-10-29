// controllers/casaformaReservationsController.js
const CasaformaReservation = require('../models/casaformaReservation');

module.exports = {
    async create(req, res) {
        try {
            const { user_id, scheduled_class_id } = req.body;
            const reservation = await CasaformaReservation.create(user_id, scheduled_class_id);
            return res.status(201).json({ success: true, message: 'Reservación confirmada.', data: reservation });
        } catch (error) {
            console.log('Error casaforma reservations.create:', error);
            return res.status(400).json({ success: false, message: error.message || 'No se pudo crear la reservación.' });
        }
    },

    async getByUserId(req, res) {
        try {
            const list = await CasaformaReservation.getByUserId(req.params.userId);
            return res.status(200).json({ success: true, message: 'OK', data: list });
        } catch (error) {
            console.log('Error casaforma reservations.getByUserId:', error);
            return res.status(500).json({ success: false, message: 'Error al obtener las reservaciones.', error: error.message });
        }
    },

    async getByClassId(req, res) {
        try {
            const list = await CasaformaReservation.getByClass(req.params.scheduledClassId);
            return res.status(200).json({ success: true, message: 'OK', data: list });
        } catch (error) {
            console.log('Error casaforma reservations.getByClassId:', error);
            return res.status(500).json({ success: false, message: 'Error al obtener las reservaciones.', error: error.message });
        }
    },

    async updateStatus(req, res) {
        try {
            const { id, status } = req.body;
            const reservation = await CasaformaReservation.updateStatus(id, status);
            if (!reservation) {
                return res.status(404).json({ success: false, message: 'Reservación no encontrada.' });
            }
            return res.status(200).json({ success: true, message: 'Estado actualizado.', data: reservation });
        } catch (error) {
            console.log('Error casaforma reservations.updateStatus:', error);
            return res.status(500).json({ success: false, message: 'Error al actualizar la reservación.', error: error.message });
        }
    },

    // Cancelación del propio cliente (MyReservationsWidget.vue) — usa
    // req.user.id (del token), nunca un id del body, para que nadie
    // pueda cancelar la reservación de otro cliente con solo adivinar su
    // id. El crédito se regresa solo si cancela a tiempo (ver
    // cancelWithCredit en el modelo).
    async cancel(req, res) {
        try {
            const { id } = req.body;
            const result = await CasaformaReservation.cancelWithCredit(id, req.user.id);
            return res.status(200).json({
                success: true,
                message: result.refunded
                    ? 'Reservación cancelada. Tu crédito fue devuelto.'
                    : 'Reservación cancelada.',
                data: result
            });
        } catch (error) {
            console.log('Error casaforma reservations.cancel:', error);
            return res.status(400).json({ success: false, message: error.message || 'No se pudo cancelar la reservación.' });
        }
    }
};
