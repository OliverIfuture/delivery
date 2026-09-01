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

    async delete(req, res) {
    try {
        const { id } = req.params;
        const data = await EmoonCategory.delete(id);
        if (data) {
            return res.status(200).json({ success: true, message: 'Categoría eliminada exitosamente', data });
        }
        return res.status(404).json({ success: false, message: 'Categoría no encontrada.' });
    } catch (error) {
        console.log('Error delete Category:', error);
        // Error 23503 en Postgres es restricción de Clave Foránea (si la categoría está siendo usada por alguna clase)
        if (error.code === '23503') {
            return res.status(400).json({ 
                success: false, 
                message: 'No se puede eliminar esta categoría porque hay clases asociadas a ella.' 
            });
        }
        return res.status(500).json({ success: false, message: 'Error al eliminar categoría', error: error.message });
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