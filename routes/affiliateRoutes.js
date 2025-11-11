const affiliateController = require('../controllers/affiliateController.js');
const passport = require('passport');

module.exports = (app) => {

    // PREFIJO: /api/affiliates
    
    /**
     * GET: /api/affiliates/my-commissions
     * Obtiene el historial de comisiones del entrenador logueado.
     */
    app.get(
        '/api/affiliates/my-commissions', 
        passport.authenticate('jwt', { session: false }), 
        affiliateController.getMyCommissions
    );

}
