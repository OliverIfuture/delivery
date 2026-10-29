// routes/casaformaSalesRoutes.js
const casaformaSalesController = require('../controllers/casaformaSalesController');
const passport = require('passport');

module.exports = (app) => {
    app.post(
        '/api/casaforma/sales/manual',
        passport.authenticate('casaforma-jwt', { session: false }),
        casaformaSalesController.createManualSale
    );
};
