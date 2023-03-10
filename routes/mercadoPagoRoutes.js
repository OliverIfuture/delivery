const mercadoPagoController = require('../controllers/mercadopagoController');
const passport = require('passport');

module.exports = (app) => {

    /*
    * POST ROUTES
    */
   app.post('/api/payments/createPay', passport.authenticate('jwt', {session: false}), mercadoPagoController.createPaymentCreditCart);
}
