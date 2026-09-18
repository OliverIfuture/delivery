const User = require('./models/user.js'); 

module.exports = {

    /**
     * Middleware para verificar si el usuario es un Super Administrador
     * Asumimos que el ID del Super Admin es '4' (basado en nuestro historial)
     */
    async isSuperAdmin(req, res, next) {
        
        const adminId = '4'; // ¡Este es tu ID de Super Admin!

        if (!req.user || req.user.id != adminId) {
            return res.status(403).json({ // 403 Forbidden
                success: false,
                message: 'Acceso denegado. No tienes permisos de administrador.'
            });
        }
        
        // Si el ID es correcto, pasa a la siguiente función (el controlador)
        next();
    },

    /**
     * Middleware para restringir rutas de Emoon a usuarios con role 'admin'.
     * Debe usarse después de passport.authenticate('emoon-jwt'), que ya deja
     * el registro completo de emoon.emoon_users (incluyendo `role`) en req.user.
     */
    async requireEmoonAdmin(req, res, next) {
        if (!req.user || req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Acceso denegado. Se requieren permisos de administrador.'
            });
        }

        next();
    }

};
