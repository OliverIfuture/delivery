// routes/emoonAnalyticsRoutes.js
const analyticsController = require('../controllers/emoonAnalyticsController');
const passport = require('passport');

module.exports = (app) => {
    app.get(
        '/api/emoon/analytics/summary',
        passport.authenticate('emoon-jwt', { session: false }),
        analyticsController.getSummary
    );
};