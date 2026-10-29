// routes/casaformaAnalyticsRoutes.js
const analyticsController = require('../controllers/casaformaAnalyticsController');
const passport = require('passport');

module.exports = (app) => {
    app.get(
        '/api/casaforma/analytics/summary',
        passport.authenticate('casaforma-jwt', { session: false }),
        analyticsController.getSummary
    );
};
