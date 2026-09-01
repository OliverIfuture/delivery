const EmoonAttendance = require('../models/emoonAttendance');

module.exports = {
    async getClassesByDate(req, res) {
        try {
            const { date } = req.query; // Captura ?date=YYYY-MM-DD
            const data = await EmoonAttendance.getClassesByDate(date);
            return res.status(200).json({ success: true, message: 'Clases obtenidas por fecha', data });
        } catch (error) {
            console.log('Error getClassesByDate:', error);
            return res.status(500).json({ success: false, message: 'Error al consultar asistencias', error: error.message });
        }
    },

    async toggleCheckIn(req, res) {
        try {
            const { reservationId, attended } = req.body;
            if (!reservationId) {
                return res.status(400).json({ success: false, message: 'El ID de reservación es requerido' });
            }
            const updated = await EmoonAttendance.toggleAttendance(reservationId, attended);
            return res.status(200).json({ success: true, message: 'Asistencia actualizada', data: updated });
        } catch (error) {
            console.log('Error toggleCheckIn:', error);
            return res.status(500).json({ success: false, message: 'Error al actualizar asistencia', error: error.message });
        }
    }
};