const cobiCheckoutController = require('../controllers/cobiCheckoutController.js');
const passport = require('passport');

module.exports = (app) => {

    // PREFIJO: /api/cobi
    app.put('/api/cobi/design', passport.authenticate('jwt', { session: false }), cobiCheckoutController.saveDesign);
    app.get('/api/cobi/design/mine', passport.authenticate('jwt', { session: false }), cobiCheckoutController.getMyDesign);

    // Público, sin login — lo usa la página de pago del cliente.
    app.get('/api/cobi/design/public/:id_trainer', cobiCheckoutController.getPublicDesign);

};
