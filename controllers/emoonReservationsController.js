const EmoonReservation = require('../models/emoonReservation');

module.exports = {
    async create(req, res) {
        try {
            const { userId, scheduledClassId, paymentInfo } = req.body;
            if (!userId || !scheduledClassId) {
                return res.status(400).json({ success: false, message: 'Faltan parámetros de usuario o clase.' });
            }

            const data = await EmoonReservation.create(userId, scheduledClassId, paymentInfo);
            return res.status(201).json({ success: true, message: 'Reserva creada exitosamente', data });
        } catch (error) {
            console.error('Error createReservation:', error.message);
            return res.status(400).json({ success: false, message: error.message });
        }
    },

    async getByClassId(req, res) {
        try {
            const { scheduledClassId } = req.params;
            const data = await EmoonReservation.getByClassId(scheduledClassId);
            return res.status(200).json({ success: true, data });
        } catch (error) {
            return res.status(500).json({ success: false, message: error.message });
        }
    },

    async updateStatus(req, res) {
        try {
            const { reservationId, status } = req.body;
            const data = await EmoonReservation.updateStatus(reservationId, status);
            return res.status(200).json({ success: true, data });
        } catch (error) {
            return res.status(500).json({ success: false, message: error.message });
        }
    },

    async getByUserId(req, res) {
        try {
            const { userId } = req.params;
            if (!userId) {
                return res.status(400).json({ success: false, message: 'El ID de usuario es requerido.' });
            }

            const data = await EmoonReservation.getByUserId(userId);
            return res.status(200).json({ success: true, data });
        } catch (error) {
            console.error('Error getByUserId:', error);
            return res.status(500).json({ success: false, message: 'Error al consultar reservas del usuario', error: error.message });
        }
    },

    async cancel(req, res) {
        try {
            const { reservationId, userId } = req.body;
            const result = await EmoonReservation.cancelWithCredit(reservationId, userId);
            const msg = result.refunded
                ? 'Reserva cancelada y crédito reembolsado.'
                : `Reserva cancelada fuera del límite (${result.cancellationHours}h). El crédito no fue devuelto.`;
            return res.status(200).json({ success: true, message: msg, refunded: result.refunded });
        } catch (error) {
            return res.status(400).json({ success: false, message: error.message });
        }
    }
};