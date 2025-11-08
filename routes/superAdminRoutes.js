const superAdminController = require('../controllers/superAdminController.js');
const passport = require('passport');
const authMiddleware = require('../authMiddleware.js'); // Importar el middleware

module.exports = (app) => {

    // PREFIJO: /api/superadmin
    
    // Proteger TODAS las rutas de este archivo con 'isSuperAdmin'
    const isSuperAdmin = authMiddleware.isSuperAdmin;

    // --- GET ---
    
    // Obtener estadísticas globales para el dashboard
    app.get(
        '/api/superadmin/stats', 
        passport.authenticate('jwt', { session: false }), 
        isSuperAdmin, // Primero verifica el token, LUEGO verifica si es Admin
        superAdminController.getDashboardStats
    );
    
    // Obtener la lista de todas las compañías (tiendas y entrenadores)
    app.get(
        '/api/superadmin/companies', 
        passport.authenticate('jwt', { session: false }), 
        isSuperAdmin, 
        superAdminController.getAllCompanies
    );

    // --- PUT ---
    
    // Aprobar una compañía (ej. cambiar 'available' a 'true')
    app.put(
        '/api/superadmin/approve-company/:id',
        passport.authenticate('jwt', { session: false }), 
        isSuperAdmin,
        superAdminController.approveCompany
    );

    // Suspender una compañía (ej. cambiar 'available' a 'false')
    app.put(
        '/api/superadmin/suspend-company/:id',
        passport.authenticate('jwt', { session: false }), 
        isSuperAdmin,
        superAdminController.suspendCompany
    );

};
