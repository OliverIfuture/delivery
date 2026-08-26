const EmoonPurchase = require('../models/emoonPurchase');

module.exports = {

    async getByUserId(req, res) {
        try {
            const userId = req.params.userId;

            if (!userId) {
                return res.status(400).json({
                    success: false,
                    message: 'El ID del usuario es obligatorio.'
                });
            }

            // Llamada al modelo con el SQL corregido
            const purchases = await EmoonPurchase.getByUserId(userId);

            return res.status(200).json({
                success: true,
                message: 'Historial de compras obtenido correctamente.',
                data: purchases
            });

        } catch (error) {
            console.log('Error en emoonPurchasesController.getByUserId:', error);
            return res.status(500).json({
                success: false,
                message: 'Error interno al obtener el historial de compras.',
                error: error.message
            });
        }
    }

};