// controllers/casaformaCategoriesController.js
const CasaformaCategory = require('../models/casaformaCategory');

module.exports = {
    async getAll(req, res) {
        try {
            const categories = await CasaformaCategory.getAll();
            return res.status(200).json({ success: true, message: 'OK', data: categories });
        } catch (error) {
            console.log('Error casaforma categories.getAll:', error);
            return res.status(500).json({ success: false, message: 'Error al obtener las categorías.', error: error.message });
        }
    },

    async create(req, res) {
        try {
            const category = await CasaformaCategory.create(req.body);
            return res.status(201).json({ success: true, message: 'Categoría creada.', data: category });
        } catch (error) {
            console.log('Error casaforma categories.create:', error);
            return res.status(500).json({ success: false, message: 'Error al crear la categoría.', error: error.message });
        }
    },

    async delete(req, res) {
        try {
            const deleted = await CasaformaCategory.delete(req.params.id);
            if (!deleted) {
                return res.status(404).json({ success: false, message: 'Categoría no encontrada.' });
            }
            return res.status(200).json({ success: true, message: 'Categoría eliminada.', data: deleted });
        } catch (error) {
            console.log('Error casaforma categories.delete:', error);
            return res.status(500).json({ success: false, message: 'Error al eliminar la categoría.', error: error.message });
        }
    }
};
