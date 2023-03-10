const mercadoPagoController = require('../controllers/mercadoPagoController.js');
const passport = require('passport');

module.exports = (app) => {

    /*
    * POST ROUTES
    */
   app.post('/api/payments/createPay', passport.authenticate('jwt', {session: false}), MercadoPagoController.createPaymentCreditCart);
}