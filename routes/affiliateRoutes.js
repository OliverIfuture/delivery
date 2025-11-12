const affiliateController = require('../controllers/affiliateController.js');
const passport = require('passport');

module.exports = (app) => {

    // PREFIJO: /api/affiliates
    
    /**
     * GET: /api/affiliates/my-commissions
     * Obtiene el historial de comisiones del entrenador logueado.
     */
    app.get(
        '/api/affiliates/my-commissions', 
        passport.authenticate('jwt', { session: false }), 
        affiliateController.getMyCommissions
    );

        /**
     * **NUEVA RUTA (Paso 15.8a)**
     * GET: /api/affiliates/my-vendor-dashboard
     * Para la Tienda (Vendedor): Ver cuánto debe y a quién.
     */
    app.get(
        '/api/affiliates/my-vendor-dashboard',
        passport.authenticate('jwt', { session: false }),
        affiliateController.getMyVendorDashboard
    );

    /**
     * **NUEVA RUTA (Paso 15.8a)**
     * PUT: /api/affiliates/mark-as-paid
     * Para la Tienda (Vendedor): Marcar un lote de comisiones como pagado.
     */
    app.put(
        '/api/affiliates/mark-as-paid',
        passport.authenticate('jwt', { session: false }),
        affiliateController.markCommissionsAsPaid
    );

        /**
     * **RUTA MODIFICADA: (Paso 15.8c)**
     * La Tienda (Vendedor) inicia el pago de comisiones.
     * Esto crea un PaymentIntent para cobrar a la *Tienda*.
     */
    app.post(
        '/api/affiliates/create-payout-intent',
        passport.authenticate('jwt', { session: false }),
        affiliateController.createPayoutIntent
    );

}
