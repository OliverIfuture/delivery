// routes/casaformaCheckoutRoutes.js
const casaformaCheckoutController = require('../controllers/casaformaCheckoutController');
const passport = require('passport');

module.exports = (app) => {
    app.post(
        '/api/casaforma/checkout/create',
        passport.authenticate('casaforma-jwt', { session: false }),
        casaformaCheckoutController.createCheckout
    );
};
