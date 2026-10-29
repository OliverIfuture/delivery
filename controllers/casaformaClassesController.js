// controllers/casaformaClassesController.js
const CasaformaClassType = require('../models/casaformaClassType');

module.exports = {
    async getAll(req, res) {
        try {
            const classes = await CasaformaClassType.getAll();
            return res.status(200).json({ success: true, message: 'OK', data: classes });
        } catch (error) {
            console.log('Error casaforma classes.getAll:', error);
            return res.status(500).json({ success: false, message: 'Error al obtener las clases.', error: error.message });
        }
    },

    async create(req, res) {
        try {
            const item = await CasaformaClassType.create(req.body);
            return res.status(201).json({ success: true, message: 'Clase creada.', data: item });
        } catch (error) {
            console.log('Error casaforma classes.create:', error);
            return res.status(500).json({ success: false, message: 'Error al crear la clase.', error: error.message });
        }
    },

    async update(req, res) {
        try {
            const item = await CasaformaClassType.update(req.params.id, req.body);
            if (!item) {
                return res.status(404).json({ success: false, message: 'Clase no encontrada.' });
            }
            return res.status(200).json({ success: true, message: 'Clase actualizada.', data: item });
        } catch (error) {
            console.log('Error casaforma classes.update:', error);
            return res.status(500).json({ success: false, message: 'Error al actualizar la clase.', error: error.message });
        }
    },

    async delete(req, res) {
        try {
            const deleted = await CasaformaClassType.delete(req.params.id);
            if (!deleted) {
                return res.status(404).json({ success: false, message: 'Clase no encontrada.' });
            }
            return res.status(200).json({ success: true, message: 'Clase eliminada.' });
        } catch (error) {
            console.log('Error casaforma classes.delete:', error);
            return res.status(500).json({ success: false, message: 'Error al eliminar la clase.', error: error.message });
        }
    }
};
