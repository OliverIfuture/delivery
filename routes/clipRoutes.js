// routes/clipRoutes.js
const clipController = require('../controllers/clipController.js');
const passport = require('passport');

module.exports = (app) => {
    app.post('/api/clip/checkout/:orderId', passport.authenticate('jwt', { session: false }), clipController.createCheckout);
    app.get('/api/clip/status/:orderId', passport.authenticate('jwt', { session: false }), clipController.getStatus);
    app.post('/api/clip/refund/:orderId', passport.authenticate('jwt', { session: false }), clipController.refund);

    // Público — lo llama Clip, no nuestro frontend.
    app.post('/api/clip/webhook', clipController.webhook);

    // TEMPORAL — solo para verificar visualmente el HTML de los correos
    // reales contra una bandeja real. Se quita en cuanto se confirme.
    app.get('/api/clip/_test-emails', passport.authenticate('jwt', { session: false }), clipController._testEmails);
};
