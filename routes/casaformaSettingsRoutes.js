// routes/casaformaSettingsRoutes.js
const casaformaSettingsController = require('../controllers/casaformaSettingsController');
const passport = require('passport');
// requireEmoonAdmin solo revisa req.user.role === 'admin' — genérico,
// no específico de Emoon, así que lo reutilizamos tal cual.
const { requireEmoonAdmin } = require('../authMiddleware');

module.exports = (app) => {
    app.get('/api/casaforma/settings', casaformaSettingsController.getSettings);

    app.put('/api/casaforma/settings/general', passport.authenticate('casaforma-jwt', { session: false }), casaformaSettingsController.updateGeneral);
    app.put('/api/casaforma/settings/booking', passport.authenticate('casaforma-jwt', { session: false }), casaformaSettingsController.updateBooking);
    app.put('/api/casaforma/settings/hours', passport.authenticate('casaforma-jwt', { session: false }), casaformaSettingsController.updateHours);

    app.get('/api/casaforma/settings/billing-status', passport.authenticate('casaforma-jwt', { session: false }), requireEmoonAdmin, casaformaSettingsController.getBillingStatus);
    app.put('/api/casaforma/settings/billing-status', passport.authenticate('casaforma-jwt', { session: false }), requireEmoonAdmin, casaformaSettingsController.updateBillingStatus);
};
