// routes/emoonScheduledClassesRoutes.js
const scheduledController = require('../controllers/emoonScheduledClassesController');
const passport = require('passport');

module.exports = (app) => {
    app.get('/api/emoon/scheduled-classes', scheduledController.getAll);

    app.post(
        '/api/emoon/scheduled-classes',
        passport.authenticate('emoon-jwt', { session: false }),
        scheduledController.create
    );

    app.put(
        '/api/emoon/scheduled-classes/cancel/:id',
        passport.authenticate('emoon-jwt', { session: false }),
        scheduledController.cancel
    );
};