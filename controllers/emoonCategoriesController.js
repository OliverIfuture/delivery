const EmoonCategory = require('../models/emoonCategory');

module.exports = {
    async getAll(req, res) {
        try {
            const categories = await EmoonCategory.getAll();
            return res.status(200).json({ success: true, message: 'Categorías obtenidas', data: categories });
        } catch (error) {
            console.log('Error getAll Categories:', error);
            return res.status(500).json({ success: false, message: 'Error al obtener categorías', error: error.message });
        }
    },

    async create(req, res) {
        try {
            const category = req.body;
            if (!category.id || !category.name) {
                return res.status(400).json({ success: false, message: 'ID y Nombre son obligatorios.' });
            }
            const data = await EmoonCategory.create(category);
            return res.status(201).json({ success: true, message: 'Categoría creada exitosamente', data: data });
        } catch (error) {
            console.log('Error create Category:', error);
            return res.status(500).json({ success: false, message: 'Error al crear la categoría', error: error.message });
        }
    }
};