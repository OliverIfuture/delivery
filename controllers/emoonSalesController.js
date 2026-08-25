// controllers/emoonSalesController.js
const EmoonSale = require('../models/emoonSale');

module.exports = {
    async createManualSale(req, res) {
        try {
            const { userId, packageId, paymentMethod } = req.body;

            if (!userId || !packageId) {
                return res.status(400).json({
                    success: false,
                    message: 'Faltan datos obligatorios (Cliente o Paquete).'
                });
            }

            // Realizamos la venta
            const data = await EmoonSale.createManualSale(userId, packageId, paymentMethod || 'Efectivo en Estudio');

            return res.status(201).json({
                success: true,
                message: '¡Venta registrada y créditos asignados con éxito!',
                data: data
            });

        } catch (error) {
            console.log('Error en emoonSalesController.createManualSale:', error);
            return res.status(500).json({
                success: false,
                message: 'Error al registrar la venta',
                error: error.message
            });
        }
    }
};