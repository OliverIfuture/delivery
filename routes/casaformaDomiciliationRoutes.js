// routes/casaformaDomiciliationRoutes.js
const casaformaDomiciliationController = require('../controllers/casaformaDomiciliationController');
const passport = require('passport');

module.exports = (app) => {
    app.get(
        '/api/casaforma/domiciliation/settings',
        passport.authenticate('casaforma-jwt', { session: false }),
        casaformaDomiciliationController.getSettings
    );
    app.put(
        '/api/casaforma/domiciliation/settings',
        passport.authenticate('casaforma-jwt', { session: false }),
        casaformaDomiciliationController.updateSettings
    );
    app.get(
        '/api/casaforma/domiciliation/subscriptions',
        passport.authenticate('casaforma-jwt', { session: false }),
        casaformaDomiciliationController.getSubscriptions
    );
    app.get(
        '/api/casaforma/domiciliation/subscriptions/user/:userId',
        passport.authenticate('casaforma-jwt', { session: false }),
        casaformaDomiciliationController.getByUserId
    );
    app.put(
        '/api/casaforma/domiciliation/subscriptions/:id/status',
        passport.authenticate('casaforma-jwt', { session: false }),
        casaformaDomiciliationController.toggleStatus
    );
    app.post(
        '/api/casaforma/domiciliation/subscriptions/:id/cancel',
        passport.authenticate('casaforma-jwt', { session: false }),
        casaformaDomiciliationController.cancel
    );
};
