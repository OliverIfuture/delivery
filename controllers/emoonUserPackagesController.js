// controllers/emoonUserPackagesController.js
const EmoonUserPackage = require('../models/emoonUserPackage');

module.exports = {
    // Obtener el paquete activo y créditos disponibles de un cliente
    async getActive(req, res) {
        try {
            const { userId } = req.params;
            if (!userId) {
                return res.status(400).json({ success: false, message: 'El ID de usuario es obligatorio.' });
            }

            const data = await EmoonUserPackage.getActivePackage(userId);
            return res.status(200).json({ success: true, data });
        } catch (error) {
            console.error('Error getActivePackage:', error);
            return res.status(500).json({ success: false, message: 'Error al obtener paquete activo', error: error.message });
        }
    },

    // Obtener todo el historial de paquetes comprados por un usuario
    async getByUserId(req, res) {
        try {
            const { userId } = req.params;
            if (!userId) {
                return res.status(400).json({ success: false, message: 'El ID de usuario es obligatorio.' });
            }

            const data = await EmoonUserPackage.getByUserId(userId);
            return res.status(200).json({ success: true, data });
        } catch (error) {
            console.error('Error getPackagesByUserId:', error);
            return res.status(500).json({ success: false, message: 'Error al consultar paquetes del usuario', error: error.message });
        }
    }
};