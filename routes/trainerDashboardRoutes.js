const trainerDashboardController = require('../controllers/trainerDashboardController.js');
const passport = require('passport');

module.exports = (app) => {

    // PREFIJO: /api/dashboard
    
    /**
     * GET: /api/dashboard/onboarding-stats
     * Obtiene las estadísticas de configuración para el checklist del entrenador
     */
    app.get(
        '/api/dashboard/onboarding-stats', 
        passport.authenticate('jwt', { session: false }), 
        trainerDashboardController.getOnboardingStats
    );

}
