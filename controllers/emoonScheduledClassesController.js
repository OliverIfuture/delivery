// controllers/emoonScheduledClassesController.js
const EmoonScheduledClass = require('../models/emoonScheduledClass');

module.exports = {
    async create(req, res) {
        try {
            const { classTypeId, instructorId, scheduledDate } = req.body;

            if (!classTypeId || !instructorId || !scheduledDate) {
                return res.status(400).json({ success: false, message: 'Faltan datos obligatorios.' });
            }

            const data = await EmoonScheduledClass.create(classTypeId, instructorId, scheduledDate);

            return res.status(201).json({
                success: true,
                message: '¡Clase agendada correctamente!',
                data: data
            });
        } catch (error) {
            console.error('Error createScheduledClass:', error);
            return res.status(500).json({ success: false, message: 'Error al agendar la clase', error: error.message });
        }
    },

    async getAll(req, res) {
        try {
            const data = await EmoonScheduledClass.getAll();
            return res.status(200).json({
                success: true,
                data: data
            });
        } catch (error) {
            console.error('Error getAllScheduledClasses:', error);
            return res.status(500).json({ success: false, message: 'Error al obtener calendario', error: error.message });
        }
    },

    async cancel(req, res) {
        try {
            const { id } = req.params;
            const data = await EmoonScheduledClass.cancel(id);

            if (!data) {
                return res.status(404).json({ success: false, message: 'Clase no encontrada.' });
            }

            return res.status(200).json({
                success: true,
                message: 'Clase cancelada exitosamente.',
                data: data
            });
        } catch (error) {
            console.error('Error cancelScheduledClass:', error);
            return res.status(500).json({ success: false, message: 'Error al cancelar la clase', error: error.message });
        }
    }
};