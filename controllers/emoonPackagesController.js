// controllers/emoonPackagesController.js
const EmoonPackage = require('../models/emoonPackage');

module.exports = {
    // Obtener catálogo completo
    async getAll(req, res) {
        try {
            const packages = await EmoonPackage.getAll();
            return res.status(200).json({
                success: true,
                message: 'Paquetes obtenidos correctamente',
                data: packages
            });
        } catch (error) {
            console.log('Error en emoonPackagesController.getAll:', error);
            return res.status(500).json({
                success: false,
                message: 'Error al obtener los paquetes',
                error: error.message
            });
        }
    },

    // Crear nuevo paquete
    async create(req, res) {
        try {
            const newPackage = req.body;

            // Validaciones básicas
            if (!newPackage.name || !newPackage.price || !newPackage.type_id) {
                return res.status(400).json({
                    success: false,
                    message: 'Faltan campos obligatorios (nombre, precio, tipo).'
                });
            }

            const data = await EmoonPackage.create(newPackage);

            return res.status(201).json({
                success: true,
                message: 'Paquete creado exitosamente',
                data: data
            });
        } catch (error) {
            console.log('Error en emoonPackagesController.create:', error);
            return res.status(500).json({
                success: false,
                message: 'Error al crear el paquete',
                error: error.message
            });
        }
    }
};