// routes/casaformaStripeConnectRoutes.js
const casaformaStripeConnectController = require('../controllers/casaformaStripeConnectController');
const passport = require('passport');
const { requireEmoonAdmin } = require('../authMiddleware');

module.exports = (app) => {
    app.get(
        '/api/casaforma/stripe-connect/status',
        passport.authenticate('casaforma-jwt', { session: false }),
        requireEmoonAdmin,
        casaformaStripeConnectController.getStatus
    );
    app.post(
        '/api/casaforma/stripe-connect/onboard',
        passport.authenticate('casaforma-jwt', { session: false }),
        requireEmoonAdmin,
        casaformaStripeConnectController.startOnboarding
    );
    app.put(
        '/api/casaforma/stripe-connect/refresh',
        passport.authenticate('casaforma-jwt', { session: false }),
        requireEmoonAdmin,
        casaformaStripeConnectController.refreshStatus
    );
    app.get(
        '/api/casaforma/stripe-connect/dashboard-link',
        passport.authenticate('casaforma-jwt', { session: false }),
        requireEmoonAdmin,
        casaformaStripeConnectController.getDashboardLink
    );
};
