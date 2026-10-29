// routes/casaformaPurchasesRoutes.js
const casaformaPurchasesController = require('../controllers/casaformaPurchasesController');
const passport = require('passport');

module.exports = (app) => {
    app.get(
        '/api/casaforma/purchases/client/:userId',
        passport.authenticate('casaforma-jwt', { session: false }),
        casaformaPurchasesController.getByUserId
    );

    app.get(
        '/api/casaforma/purchases/all',
        passport.authenticate('casaforma-jwt', { session: false }),
        casaformaPurchasesController.getAll
    );
};
