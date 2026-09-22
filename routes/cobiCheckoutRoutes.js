const cobiCheckoutController = require('../controllers/cobiCheckoutController.js');
const passport = require('passport');

module.exports = (app) => {

    // PREFIJO: /api/cobi
    app.put('/api/cobi/design', passport.authenticate('jwt', { session: false }), cobiCheckoutController.saveDesign);
    app.get('/api/cobi/design/mine', passport.authenticate('jwt', { session: false }), cobiCheckoutController.getMyDesign);

    // Público, sin login — lo usa la página de pago del cliente.
    app.get('/api/cobi/design/public/:id_trainer', cobiCheckoutController.getPublicDesign);

    // NUEVO — planes reales + el pago en sí, ambos públicos (el visitante
    // todavía no tiene cuenta cuando abre el enlace de pago).
    app.get('/api/cobi/plans/:id_trainer', cobiCheckoutController.getPublicPlans);
    app.post('/api/cobi/checkout', cobiCheckoutController.createCheckout);

};
