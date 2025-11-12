const gymController = require('../controllers/gymController.js');
const passport = require('passport');

module.exports = (app) => {

    // PREFIJO: /api/gym

    /**
     * **NUEVA RUTA (G2.1a)**
     * GET: /api/gym/generate-access-token
     * La app del CLIENTE llama a esto cada 25 segundos para obtener un
     * nuevo token de QR dinámico.
     */
    app.get('/api/gym/generate-access-token', passport.authenticate('jwt', { session: false }), gymController.generateAccessToken);


    /**
     * **RUTA MODIFICADA (G2.1b)**
     * POST: /api/gym/check-in
     * El KIOSCO (Tablet) llama a esto con el token del QR escaneado.
     */
    app.post('/api/gym/check-in', passport.authenticate('jwt', { session: false }), gymController.checkInWithToken);


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

}
