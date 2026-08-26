const emoonPurchasesController = require('../controllers/emoonPurchasesController');
const passport = require('passport');

module.exports = (app) => {

    // ==========================================================
    // RUTAS PRIVADAS (Requieren el token 'emoon-jwt')
    // ==========================================================

    // GET: /api/emoon/purchases/client/:userId
    app.get(
        '/api/emoon/purchases/client/:userId',
        passport.authenticate('emoon-jwt', { session: false }),
        emoonPurchasesController.getByUserId
    );

    app.get(
        '/api/emoon/purchases/all',
        passport.authenticate('emoon-jwt', { session: false }),
        emoonPurchasesController.getAll
    );

};