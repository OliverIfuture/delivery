// routes/clipRoutes.js
const clipController = require('../controllers/clipController.js');
const passport = require('passport');

module.exports = (app) => {
    app.post('/api/clip/checkout/:orderId', passport.authenticate('jwt', { session: false }), clipController.createCheckout);
    app.get('/api/clip/status/:orderId', passport.authenticate('jwt', { session: false }), clipController.getStatus);
    app.post('/api/clip/refund/:orderId', passport.authenticate('jwt', { session: false }), clipController.refund);

    // Público — lo llama Clip, no nuestro frontend.
    app.post('/api/clip/webhook', clipController.webhook);
};
