const EmoonClassType = require('../models/emoonClassType');

module.exports = {
    async getAll(req, res) {
        try {
            const classes = await EmoonClassType.getAll();
            return res.status(200).json({ success: true, message: 'Clases obtenidas', data: classes });
        } catch (error) {
            console.log('Error getAll Classes:', error);
            return res.status(500).json({ success: false, message: 'Error al obtener clases', error: error.message });
        }
    },

    async create(req, res) {
        try {
            const newClass = req.body;
            if (!newClass.name || !newClass.category_id || !newClass.max_capacity) {
                return res.status(400).json({ success: false, message: 'Nombre, Categoría y Cupo son obligatorios.' });
            }
            const data = await EmoonClassType.create(newClass);
            return res.status(201).json({ success: true, message: 'Clase creada exitosamente', data: data });
        } catch (error) {
            console.log('Error create Class:', error);
            return res.status(500).json({ success: false, message: 'Error al crear la clase', error: error.message });
        }
    },

    async update(req, res) {
        try {
            const id = req.params.id;
            const data = await EmoonClassType.update(id, req.body);
            if (data) {
                return res.status(200).json({ success: true, message: 'Clase actualizada', data: data });
            }
            return res.status(404).json({ success: false, message: 'Clase no encontrada.' });
        } catch (error) {
            console.log('Error update Class:', error);
            return res.status(500).json({ success: false, message: 'Error al actualizar', error: error.message });
        }
    },

    async delete(req, res) {
        try {
            const id = req.params.id;
            const data = await EmoonClassType.delete(id);
            if (data) {
                return res.status(200).json({ success: true, message: 'Clase eliminada exitosamente', data: data });
            }
            return res.status(404).json({ success: false, message: 'Clase no encontrada.' });
        } catch (error) {
            console.log('Error delete Class:', error);
            return res.status(500).json({ success: false, message: 'Error al eliminar la clase', error: error.message });
        }
    }
};