// routes/clientAdherenceRoutes.js
//
// NUEVO — ver controllers/clientAdherenceController.js.
const passport = require('passport');
const clientAdherenceController = require('../controllers/clientAdherenceController.js');

module.exports = (app) => {
    const auth = passport.authenticate('jwt', { session: false });
    app.get('/api/clients/weeklyAdherence', auth, clientAdherenceController.getMyClientsWeeklyAdherence);
};
