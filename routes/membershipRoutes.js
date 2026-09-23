const membershipController = require('../controllers/membershipController.js');
const passport = require('passport');

module.exports = (app) => {

    // PREFIJO: /api/membership — planes reales de la plataforma (lo que
    // paga un entrenador para usar Trainer Partners).

    // Público — se muestra durante el registro, antes de tener cuenta.
    app.get('/api/membership/plans', membershipController.getPublicPlans);

    // Requieren sesión — se llaman justo después de crear la cuenta
    // (ver RegisterTrainerFlow.vue), ya logueado.
    app.post('/api/membership/checkout', passport.authenticate('jwt', { session: false }), membershipController.createCheckout);
    app.post('/api/membership/confirm', passport.authenticate('jwt', { session: false }), membershipController.confirmPayment);

};
