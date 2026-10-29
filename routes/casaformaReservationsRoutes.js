// routes/casaformaReservationsRoutes.js
const reservationsController = require('../controllers/casaformaReservationsController');
const passport = require('passport');

module.exports = (app) => {
    app.post(
        '/api/casaforma/reservations',
        passport.authenticate('casaforma-jwt', { session: false }),
        reservationsController.create
    );

    app.get(
        '/api/casaforma/reservations/user/:userId',
        passport.authenticate('casaforma-jwt', { session: false }),
        reservationsController.getByUserId
    );

    app.get(
        '/api/casaforma/reservations/class/:scheduledClassId',
        passport.authenticate('casaforma-jwt', { session: false }),
        reservationsController.getByClassId
    );

    app.put(
        '/api/casaforma/reservations/status',
        passport.authenticate('casaforma-jwt', { session: false }),
        reservationsController.updateStatus
    );

    app.post(
        '/api/casaforma/reservations/cancel',
        passport.authenticate('casaforma-jwt', { session: false }),
        reservationsController.cancel
    );
};
