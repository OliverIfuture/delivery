const clientSubscriptionsController = require('../controllers/clientSubscriptionsController.js');
const passport = require('passport');

module.exports = (app) => {

    // PREFIJO: /api/subscriptions
    
    // --- POST ---
    
    /**
     * Endpoint principal para el cliente.
     * Recibe un id_plan y un id_company (del entrenador).
     * Crea una sesión de Stripe Checkout y devuelve la URL de pago.
     */
    app.post('/api/subscriptions/create-checkout-session', passport.authenticate('jwt', { session: false }), clientSubscriptionsController.createCheckoutSession);
    
    /**
     * WEBHOOK DE STRIPE
     * Esta ruta NO usa autenticación de pasaporte, ya que es llamada por Stripe.
     * Stripe la usa para notificarnos de eventos (pago exitoso, fallo, cancelación).
     * Esta es la ruta que debes configurar en tu Dashboard de Stripe.
     */
    app.post('/api/subscriptions/webhook', clientSubscriptionsController.stripeWebhook);

    // --- GET ---
    
    /**
     * Endpoint vital para la app del cliente.
     * La app llama a esto al iniciar para ver si el cliente tiene una suscripción "activa".
     */
    app.get('/api/subscriptions/getStatus', passport.authenticate('jwt', { session: false }), clientSubscriptionsController.getSubscriptionStatus);

};
