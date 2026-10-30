// routes/emoonDomiciliationRoutes.js — puerto 1:1 de
// casaformaDomiciliationRoutes.js.
const emoonDomiciliationController = require('../controllers/emoonDomiciliationController');
const passport = require('passport');

module.exports = (app) => {
    app.get(
        '/api/emoon/domiciliation/settings',
        passport.authenticate('emoon-jwt', { session: false }),
        emoonDomiciliationController.getSettings
    );
    app.put(
        '/api/emoon/domiciliation/settings',
        passport.authenticate('emoon-jwt', { session: false }),
        emoonDomiciliationController.updateSettings
    );
    app.get(
        '/api/emoon/domiciliation/subscriptions',
        passport.authenticate('emoon-jwt', { session: false }),
        emoonDomiciliationController.getSubscriptions
    );
    app.get(
        '/api/emoon/domiciliation/subscriptions/user/:userId',
        passport.authenticate('emoon-jwt', { session: false }),
        emoonDomiciliationController.getByUserId
    );
    app.put(
        '/api/emoon/domiciliation/subscriptions/:id/status',
        passport.authenticate('emoon-jwt', { session: false }),
        emoonDomiciliationController.toggleStatus
    );
    app.post(
        '/api/emoon/domiciliation/subscriptions/:id/cancel',
        passport.authenticate('emoon-jwt', { session: false }),
        emoonDomiciliationController.cancel
    );
};
