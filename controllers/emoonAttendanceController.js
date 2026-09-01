const EmoonAttendance = require('../models/emoonAttendance');

module.exports = {
    async getTodayClasses(req, res) {
        try {
            const data = await EmoonAttendance.getTodayClassesWithUsers();
            return res.status(200).json({ success: true, message: 'Clases de hoy obtenidas', data });
        } catch (error) {
            console.log('Error getTodayClasses:', error);
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