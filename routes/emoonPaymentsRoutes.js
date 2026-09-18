const emoonPaymentsController = require('../controllers/emoonPaymentsController');
const passport = require('passport');
const { requireEmoonAdmin } = require('../authMiddleware');

module.exports = (app) => {
    app.post(
        '/api/emoon/payments/create-payment-intent',
        passport.authenticate('emoon-jwt', { session: false }),
        emoonPaymentsController.createPackagePaymentIntent
    );

    app.post(
        '/api/emoon/payments/create-admin-billing-intent',
        passport.authenticate('emoon-jwt', { session: false }),
        requireEmoonAdmin,
        emoonPaymentsController.createAdminBillingIntent
    );
};
