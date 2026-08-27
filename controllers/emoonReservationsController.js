// controllers/emoonReservationsController.js
const EmoonReservation = require('../models/emoonReservation');

module.exports = {
    async create(req, res) {
        try {
            const { userId, scheduledClassId } = req.body;
            if (!userId || !scheduledClassId) {
                return res.status(400).json({ success: false, message: 'Se requiere cliente y clase.' });
            }

            const reservation = await EmoonReservation.create(userId, scheduledClassId);
            return res.status(201).json({
                success: true,
                message: '¡Reserva creada exitosamente!',
                data: reservation
            });
        } catch (error) {
            console.error('Error en createReservation:', error);
            return res.status(500).json({ success: false, message: error.message || 'Error al crear la reserva.' });
        }
    },

    async getByClass(req, res) {
        try {
            const { classId } = req.params;
            const attendees = await EmoonReservation.getByClassId(classId);
            return res.status(200).json({
                success: true,
                data: attendees
            });
        } catch (error) {
            console.error('Error en getByClass:', error);
            return res.status(500).json({ success: false, message: 'Error al obtener alumnos.', error: error.message });
        }
    },

    async updateStatus(req, res) {
        try {
            const { id } = req.params;
            const { status } = req.body; // 'attended', 'no_show', 'cancelled'

            const updated = await EmoonReservation.updateStatus(id, status);
            return res.status(200).json({
                success: true,
                message: 'Estado de asistencia actualizado.',
                data: updated
            });
        } catch (error) {
            console.error('Error en updateStatus:', error);
            return res.status(500).json({ success: false, message: 'Error al cambiar asistencia.', error: error.message });
        }
    }
};