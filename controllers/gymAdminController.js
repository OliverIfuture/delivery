const GymAdmin = require('../models/gymAdmin.js');

module.exports = {

    /**
     * GET /api/gym/admin/stats
     * Obtiene las estadísticas (K-Cards) para el dashboard del admin.
     */
    async getStats(req, res, next) {
        try {
            const id_company = req.user.mi_store;
            if (!id_company) {
                return res.status(403).json({ success: false, message: 'Usuario no autorizado.' });
            }

            const data = await GymAdmin.getStats(id_company);
            
            return res.status(200).json({
                success: true,
                data: data
            });

        } catch (error) {
            console.log(`Error en gymAdminController.getStats: ${error}`);
            return res.status(501).json({
                success: false,
                message: 'Error al obtener las estadísticas',
                error: error.message
            });
        }
    },

    /**
     * GET /api/gym/admin/access-logs/today
     * Obtiene el registro de accesos del día de hoy.
     */
    async getTodayAccessLogs(req, res, next) {
        try {
            const id_company = req.user.mi_store;
            if (!id_company) {
                return res.status(403).json({ success: false, message: 'Usuario no autorizado.' });
            }

            // **CAMBIO:** Llama a la consulta revertida
            const data = await GymAdmin.getTodayAccessLogs(id_company); 
            
            return res.status(200).json(data);

        } catch (error) {
            console.log(`Error en gymAdminController.getTodayAccessLogs: ${error}`);
            return res.status(501).json({
                success: false,
                message: 'Error al obtener los registros de acceso',
                error: error.message
            });
        }
    },

};
