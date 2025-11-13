const clientSubscriptionsController = require('../controllers/clientSubscriptionsController.js');
const passport = require('passport');

module.exports = (app) => {

    // PREFIJO: /api/subscriptions
    
    // --- POST ---
    
    /**
     * CAMBIO: Este endpoint ahora crea una intención de suscripción
     * y devuelve un 'clientSecret' para el SDK nativo, NO una URL.
     */
    app.post('/api/subscriptions/create-subscription-intent', passport.authenticate('jwt', { session: false }), clientSubscriptionsController.createSubscriptionIntent);
    
    /**
     * WEBHOOK DE STRIPE
     * Esta ruta sigue siendo vital.
     */
    app.post('/api/subscriptions/webhook', clientSubscriptionsController.stripeWebhook);
    app.post('/api/subscriptions/create-extension-intent', passport.authenticate('jwt', { session: false }), clientSubscriptionsController.createExtensionIntent);


    // --- GET ---
    
    /**
     * Obtiene el estado de la suscripción del cliente.
     */
    app.get('/api/subscriptions/getStatus', passport.authenticate('jwt', { session: false }), clientSubscriptionsController.getSubscriptionStatus);

};
