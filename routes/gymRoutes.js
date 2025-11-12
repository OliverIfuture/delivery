const gymController = require('../controllers/gymController.js');
const passport = require('passport');

module.exports = (app) => {

    // PREFIJO: /api/gym

    /**
     * POST: /api/gym/check-in
     * Esta es la ruta CRÍTICA que usará la App de Kiosco (Tablet).
     * Recibe un QR (token), valida al usuario y su membresía, y devuelve si puede entrar o no.
     * El Kiosco debe estar logueado como un 'staff' del gimnasio.
     */
    app.post('/api/gym/check-in', passport.authenticate('jwt', { session: false }), gymController.checkIn);

    /**
     * POST: /api/gym/create-membership
     * Usado por el Admin del Gimnasio (POS) para vender una membresía (ej. en efectivo).
     */
    app.post('/api/gym/create-membership', passport.authenticate('jwt', { session: false }), gymController.createMembership);

    /**
     * GET: /api/gym/get-membership-status/:id_client
     * Usado por la App del Cliente para saber si debe mostrar el QR.
     */
    app.get('/api/gym/get-membership-status/:id_client', passport.authenticate('jwt', { session: false }), gymController.getMembershipStatus);

    // (Más rutas vendrán aquí después, como Apertura Manual, etc.)
}
