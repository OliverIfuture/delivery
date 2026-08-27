// routes/emoonSettingsRoutes.js
const emoonSettingsController = require('../controllers/emoonSettingsController');
const passport = require('passport');

module.exports = (app) => {

    app.get('/api/emoon/settings', passport.authenticate('emoon-jwt', { session: false }), emoonSettingsController.getSettings);

    app.put('/api/emoon/settings/general', passport.authenticate('emoon-jwt', { session: false }), emoonSettingsController.updateGeneral);

    app.put('/api/emoon/settings/booking', passport.authenticate('emoon-jwt', { session: false }), emoonSettingsController.updateBooking);

    app.put('/api/emoon/settings/hours', passport.authenticate('emoon-jwt', { session: false }), emoonSettingsController.updateHours);

};