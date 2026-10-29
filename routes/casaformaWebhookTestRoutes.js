// routes/casaformaWebhookTestRoutes.js — TEMPORAL, se borra junto con
// el controller en cuanto se confirme el resultado de la prueba.
const casaformaWebhookTestController = require('../controllers/casaformaWebhookTestController');
const passport = require('passport');
const { requireEmoonAdmin } = require('../authMiddleware');

module.exports = (app) => {
    app.get(
        '/api/casaforma/webhook/test-dry-run',
        passport.authenticate('casaforma-jwt', { session: false }),
        requireEmoonAdmin,
        casaformaWebhookTestController.dryRun
    );
};
