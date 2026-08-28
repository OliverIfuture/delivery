// routes/emoonReservationsRoutes.js
const reservationsController = require('../controllers/emoonReservationsController');
const passport = require('passport');

module.exports = (app) => {
    // Crear reserva con validación y descuento de créditos
    app.post(
        '/api/emoon/reservations',
        passport.authenticate('emoon-jwt', { session: false }),
        reservationsController.create
    );

    // Obtener lista de inscritos por clase (para el pase de lista)
    app.get(
        '/api/emoon/reservations/class/:scheduledClassId',
        passport.authenticate('emoon-jwt', { session: false }),
        reservationsController.getByClassId
    );

    // Actualizar estado de asistencia (Check-in / Ausencia / Cancelación manual)
    app.put(
        '/api/emoon/reservations/status',
        passport.authenticate('emoon-jwt', { session: false }),
        reservationsController.updateStatus
    );

    // Cancelar reserva por parte del cliente (evalúa reembolso)
    app.post(
        '/api/emoon/reservations/cancel',
        passport.authenticate('emoon-jwt', { session: false }),
        reservationsController.cancel
    );
};