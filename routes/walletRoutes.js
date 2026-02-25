const walletController = require('../controllers/walletController.js');
const passport = require('passport');

module.exports = (app) => {
    // PREFIJO: /api/wallet

    // --- POST ---
    // Genera la URL de Stripe Checkout para recargar monedas
    app.post('/api/wallet/create-checkout', passport.authenticate('jwt', { session: false }), walletController.createCheckoutSession);

    // --- GET ---
    // Obtiene el historial de transacciones del usuario
    app.get('/api/wallet/history', passport.authenticate('jwt', { session: false }), walletController.getTransactionHistory);
    // Agrega esta línea en tu archivo de rutas de wallet
    app.post('/api/wallet/pay-with-reps', passport.authenticate('jwt', { session: false }), walletController.payWithReps);
};