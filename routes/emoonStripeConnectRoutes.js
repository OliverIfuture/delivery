// routes/emoonStripeConnectRoutes.js — puerto 1:1 de
// casaformaStripeConnectRoutes.js.
const emoonStripeConnectController = require('../controllers/emoonStripeConnectController');
const passport = require('passport');
const { requireEmoonAdmin } = require('../authMiddleware');

module.exports = (app) => {
    app.get(
        '/api/emoon/stripe-connect/status',
        passport.authenticate('emoon-jwt', { session: false }),
        requireEmoonAdmin,
        emoonStripeConnectController.getStatus
    );
    app.post(
        '/api/emoon/stripe-connect/onboard',
        passport.authenticate('emoon-jwt', { session: false }),
        requireEmoonAdmin,
        emoonStripeConnectController.startOnboarding
    );
    app.put(
        '/api/emoon/stripe-connect/refresh',
        passport.authenticate('emoon-jwt', { session: false }),
        requireEmoonAdmin,
        emoonStripeConnectController.refreshStatus
    );
    app.get(
        '/api/emoon/stripe-connect/dashboard-link',
        passport.authenticate('emoon-jwt', { session: false }),
        requireEmoonAdmin,
        emoonStripeConnectController.getDashboardLink
    );
};
