// routes/casaformaCheckoutRoutes.js
const casaformaCheckoutController = require('../controllers/casaformaCheckoutController');
const passport = require('passport');
const { requireEmoonAdmin } = require('../authMiddleware');

module.exports = (app) => {
    app.post(
        '/api/casaforma/checkout/create',
        passport.authenticate('casaforma-jwt', { session: false }),
        casaformaCheckoutController.createCheckout
    );

    app.post(
        '/api/casaforma/checkout/admin-billing',
        passport.authenticate('casaforma-jwt', { session: false }),
        requireEmoonAdmin,
        casaformaCheckoutController.createAdminBillingCheckout
    );
};
