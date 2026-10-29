// controllers/casaformaAttendanceController.js
const CasaformaAttendance = require('../models/casaformaAttendance');

module.exports = {
    async getClassesByDate(req, res) {
        try {
            const classes = await CasaformaAttendance.getClassesByDate(req.query.date);
            return res.status(200).json({ success: true, message: 'OK', data: classes });
        } catch (error) {
            console.log('Error casaforma attendance.getClassesByDate:', error);
            return res.status(500).json({ success: false, message: 'Error al obtener las clases del día.', error: error.message });
        }
    },

    async toggleCheckIn(req, res) {
        try {
            const { reservation_id, attended } = req.body;
            const reservation = await CasaformaAttendance.toggleAttendance(reservation_id, attended);
            if (!reservation) {
                return res.status(404).json({ success: false, message: 'Reservación no encontrada.' });
            }
            return res.status(200).json({ success: true, message: 'Asistencia actualizada.' });
        } catch (error) {
            console.log('Error casaforma attendance.toggleCheckIn:', error);
            return res.status(500).json({ success: false, message: 'Error al actualizar la asistencia.', error: error.message });
        }
    }
};
