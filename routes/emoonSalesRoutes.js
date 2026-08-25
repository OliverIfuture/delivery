// routes/emoonSalesRoutes.js
const emoonSalesController = require('../controllers/emoonSalesController');
const passport = require('passport');

module.exports = (app) => {
    // POST: Registrar venta manual (Protegido para Staff/Admins)
    app.post(
        '/api/emoon/sales/manual',
        passport.authenticate('emoon-jwt', { session: false }),
        emoonSalesController.createManualSale
    );
};