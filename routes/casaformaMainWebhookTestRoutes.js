// routes/casaformaMainWebhookTestRoutes.js — TEMPORAL, se borra junto
// con el controller en cuanto se confirme el resultado.
const casaformaMainWebhookTestController = require('../controllers/casaformaMainWebhookTestController');
const passport = require('passport');
const { requireEmoonAdmin } = require('../authMiddleware');

module.exports = (app) => {
    app.get(
        '/api/casaforma/webhook/test-main-secret',
        passport.authenticate('casaforma-jwt', { session: false }),
        requireEmoonAdmin,
        casaformaMainWebhookTestController.dryRun
    );
};
