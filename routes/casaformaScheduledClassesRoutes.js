// routes/casaformaScheduledClassesRoutes.js
const scheduledController = require('../controllers/casaformaScheduledClassesController');
const passport = require('passport');

module.exports = (app) => {
    app.get('/api/casaforma/scheduled-classes', scheduledController.getAll);
    app.post('/api/casaforma/scheduled-classes', passport.authenticate('casaforma-jwt', { session: false }), scheduledController.create);
    app.put('/api/casaforma/scheduled-classes/cancel/:id', passport.authenticate('casaforma-jwt', { session: false }), scheduledController.cancel);
};
