// routes/referralsRoutes.js
const passport = require('passport');
const referralsController = require('../controllers/referralsController.js');

module.exports = (app) => {
    app.get('/api/referrals/me', passport.authenticate('jwt', { session: false }), referralsController.getMyReferrals);
};
