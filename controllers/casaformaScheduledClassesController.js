// controllers/casaformaScheduledClassesController.js
const CasaformaScheduledClass = require('../models/casaformaScheduledClass');

module.exports = {
    async getAll(req, res) {
        try {
            const classes = await CasaformaScheduledClass.getAll();
            return res.status(200).json({ success: true, message: 'OK', data: classes });
        } catch (error) {
            console.log('Error casaforma scheduled-classes.getAll:', error);
            return res.status(500).json({ success: false, message: 'Error al obtener las clases agendadas.', error: error.message });
        }
    },

    async create(req, res) {
        try {
            const item = await CasaformaScheduledClass.create(req.body);
            return res.status(201).json({ success: true, message: 'Clase agendada.', data: item });
        } catch (error) {
            console.log('Error casaforma scheduled-classes.create:', error);
            return res.status(500).json({ success: false, message: 'Error al agendar la clase.', error: error.message });
        }
    },

    async cancel(req, res) {
        try {
            const item = await CasaformaScheduledClass.cancel(req.params.id);
            if (!item) {
                return res.status(404).json({ success: false, message: 'Clase no encontrada.' });
            }
            return res.status(200).json({ success: true, message: 'Clase cancelada.', data: item });
        } catch (error) {
            console.log('Error casaforma scheduled-classes.cancel:', error);
            return res.status(500).json({ success: false, message: 'Error al cancelar la clase.', error: error.message });
        }
    }
};
