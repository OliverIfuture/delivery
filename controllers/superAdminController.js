const User = require('../models/user.js');
const ClientSubscription = require('../models/clientSubscription.js');
const SubscriptionPlan = require('../models/subscriptionPlan.js');

module.exports = {

    /**
     * Obtiene estadísticas globales para el Dashboard del Admin
     */
    async getDashboardStats(req, res, next) {
        try {
            // Ejecutar todas las consultas de estadísticas en paralelo
            const results = await Promise.all([
                User.getTotalUsers(),
                User.getTotalCompanies(),
                ClientSubscription.getTotalRevenue(), // (Necesitamos crear esta función)
                ClientSubscription.getTotalActiveSubscriptions() // (Necesitamos crear esta función)
            ]);

            // Parsear los resultados (vienen como { count: '...' } o { sum: '...' })
            const totalUsers = parseInt(results[0].count, 10);
            const totalCompanies = parseInt(results[1].count, 10);
            const totalRevenue = parseFloat(results[2].sum) || 0.0;
            const activeSubscriptions = parseInt(results[3].count, 10);

            return res.status(200).json({
                success: true,
                data: {
                    totalUsers,
                    totalCompanies,
                    totalRevenue,
                    activeSubscriptions
                }
            });
            
        } catch (error) {
            console.log(`Error en superAdminController.getDashboardStats: ${error}`);
            return res.status(501).json({
                success: false,
                message: 'Error al obtener las estadísticas',
                error: error.message
            });
        }
    },

    /**
     * Obtiene una lista de todas las compañías (Tiendas y Entrenadores)
     */
    async getAllCompanies(req, res, next) {
        try {
            const data = await User.getAllCompanies();
            return res.status(200).json(data);
        } catch (error) {
            console.log(`Error en superAdminController.getAllCompanies: ${error}`);
            return res.status(501).json({
                success: false,
                message: 'Error al obtener las compañías',
                error: error
            });
        }
    },
    
    /**
     * Aprueba una compañía
     */
    async approveCompany(req, res, next) {
        try {
            const id_company = req.params.id;
            await User.updateCompanyStatus(id_company, 'true'); // 'true' como string (basado en tu modelo 'company')
            
            return res.status(200).json({
                success: true,
                message: 'Compañía aprobada correctamente.'
            });
        } catch (error) {
            console.log(`Error en superAdminController.approveCompany: ${error}`);
            return res.status(501).json({
                success: false,
                message: 'Error al aprobar la compañía',
                error: error
            });
        }
    },
    
    /**
     * Suspende una compañía
     */
    async suspendCompany(req, res, next) {
        try {
            const id_company = req.params.id;
            await User.updateCompanyStatus(id_company, 'false'); // 'false' como string
            
            return res.status(200).json({
                success: true,
                message: 'Compañía suspendida correctamente.'
            });
        } catch (error) {
            console.log(`Error en superAdminController.suspendCompany: ${error}`);
            return res.status(501).json({
                success: false,
                message: 'Error al suspender la compañía',
                error: error
            });
        }
    },

};
