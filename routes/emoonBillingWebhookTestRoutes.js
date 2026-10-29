// routes/emoonBillingWebhookTestRoutes.js — TEMPORAL, se borra junto
// con el controller en cuanto se confirme el resultado.
const emoonBillingWebhookTestController = require('../controllers/emoonBillingWebhookTestController');
const passport = require('passport');
const { requireEmoonAdmin } = require('../authMiddleware');

module.exports = (app) => {
    app.get(
        '/api/emoon/settings/billing-test-dry-run',
        passport.authenticate('emoon-jwt', { session: false }),
        requireEmoonAdmin,
        emoonBillingWebhookTestController.dryRun
    );
};
