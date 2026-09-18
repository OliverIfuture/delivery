// routes/emoonSettingsRoutes.js
const emoonSettingsController = require('../controllers/emoonSettingsController');
const passport = require('passport');
const { requireEmoonAdmin } = require('../authMiddleware');

module.exports = (app) => {

    app.get('/api/emoon/settings', emoonSettingsController.getSettings);

    app.put('/api/emoon/settings/general', passport.authenticate('emoon-jwt', { session: false }), emoonSettingsController.updateGeneral);

    app.put('/api/emoon/settings/booking', passport.authenticate('emoon-jwt', { session: false }), emoonSettingsController.updateBooking);

    app.put('/api/emoon/settings/hours', passport.authenticate('emoon-jwt', { session: false }), emoonSettingsController.updateHours);

    app.get('/api/emoon/settings/billing-status', passport.authenticate('emoon-jwt', { session: false }), requireEmoonAdmin, emoonSettingsController.getBillingStatus);

    app.put('/api/emoon/settings/billing-status', passport.authenticate('emoon-jwt', { session: false }), requireEmoonAdmin, emoonSettingsController.updateBillingStatus);

};