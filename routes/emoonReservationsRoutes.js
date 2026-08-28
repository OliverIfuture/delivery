// routes/emoonReservationsRoutes.js
const reservationsController = require('../controllers/emoonReservationsController');
const passport = require('passport');

module.exports = (app) => {
    // Crear reserva
    app.post(
        ['/api/emoon/reservations', '/api/emoon/reservations/create'],
        passport.authenticate('emoon-jwt', { session: false }),
        reservationsController.create
    );

    // Obtener reservas de un alumno/cliente
    app.get(
        '/api/emoon/reservations/user/:userId',
        passport.authenticate('emoon-jwt', { session: false }),
        reservationsController.getByUserId
    );

    // Obtener inscritos por clase (pase de lista)
    app.get(
        '/api/emoon/reservations/class/:scheduledClassId',
        passport.authenticate('emoon-jwt', { session: false }),
        reservationsController.getByClassId
    );

    // Actualizar asistencia
    app.put(
        '/api/emoon/reservations/status',
        passport.authenticate('emoon-jwt', { session: false }),
        reservationsController.updateStatus
    );

    // Cancelar reserva con reembolso
    app.post(
        '/api/emoon/reservations/cancel',
        passport.authenticate('emoon-jwt', { session: false }),
        reservationsController.cancel
    );
};