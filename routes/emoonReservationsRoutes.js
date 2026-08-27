// routes/emoonReservationsRoutes.js
const emoonReservationsController = require('../controllers/emoonReservationsController');
const passport = require('passport');

module.exports = (app) => {
    app.post(
        '/api/emoon/reservations/create',
        passport.authenticate('emoon-jwt', { session: false }),
        emoonReservationsController.create
    );

    app.get(
        '/api/emoon/reservations/class/:classId',
        passport.authenticate('emoon-jwt', { session: false }),
        emoonReservationsController.getByClass
    );

    app.put(
        '/api/emoon/reservations/:id/status',
        passport.authenticate('emoon-jwt', { session: false }),
        emoonReservationsController.updateStatus
    );
};