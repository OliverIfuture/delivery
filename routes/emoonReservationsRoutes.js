// routes/emoonReservationsRoutes.js
const reservationsController = require('../controllers/emoonReservationsController');
const passport = require('passport');

module.exports = (app) => {
    // Soporta tanto /api/emoon/reservations como /api/emoon/reservations/create
    app.post(
        ['/api/emoon/reservations', '/api/emoon/reservations/create'],
        passport.authenticate('emoon-jwt', { session: false }),
        reservationsController.create
    );

    app.get(
        '/api/emoon/reservations/class/:scheduledClassId',
        passport.authenticate('emoon-jwt', { session: false }),
        reservationsController.getByClassId
    );

    app.put(
        '/api/emoon/reservations/status',
        passport.authenticate('emoon-jwt', { session: false }),
        reservationsController.updateStatus
    );

    app.post(
        '/api/emoon/reservations/cancel',
        passport.authenticate('emoon-jwt', { session: false }),
        reservationsController.cancel
    );
};