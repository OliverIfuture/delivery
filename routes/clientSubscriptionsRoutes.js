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
    app.get('/api/subscriptions/retry-link/:stripe_subscription_id', clientSubscriptionsController.getRetryPaymentLink);
    /**
     * WEBHOOK DE STRIPE
     * Esta ruta sigue siendo vital.
     */
    app.post('/api/subscriptions/upgrade', passport.authenticate('jwt', { session: false }), clientSubscriptionsController.upgradeSubscription);

    app.post('/api/subscriptions/webhook', clientSubscriptionsController.stripeWebhook);
    app.post('/api/subscriptions/create-extension-intent', passport.authenticate('jwt', { session: false }), clientSubscriptionsController.createExtensionIntent);
    app.put('/api/subscriptions/getFree/:id', clientSubscriptionsController.getFree);
    app.post('/api/subscriptions/create-recurring-registration', clientSubscriptionsController.createRecurringRegistrationIntent);
    app.get('/api/subscriptions/history/:stripe_subscription_id', clientSubscriptionsController.getPaymentHistory);
    // --- GET ---

    /**
     * Obtiene el estado de la suscripción del cliente.
     */
    app.get('/api/subscriptions/getStatus', passport.authenticate('jwt', { session: false }), clientSubscriptionsController.getSubscriptionStatus);
    app.get('/api/subscriptions/getStatusTrainer', passport.authenticate('jwt', { session: false }), clientSubscriptionsController.getSubscriptionStatusTrainer);
    app.post('/api/subscriptions/create-manual', passport.authenticate('jwt', { session: false }), clientSubscriptionsController.createManualRequest);

    app.get('/api/subscriptions/pending', passport.authenticate('jwt', { session: false }), clientSubscriptionsController.getPendingRequests);
    app.put('/api/subscriptions/approve', passport.authenticate('jwt', { session: false }), clientSubscriptionsController.approveRequest);
    // Cancelar suscripción activa
    app.post('/api/subscriptions/cancel', passport.authenticate('jwt', { session: false }), clientSubscriptionsController.cancelSubscription);

    // NUEVO — Membresía + historial de pagos de UN cliente específico, para
    // la pestaña "Configuración" de su ficha en el panel del entrenador.
    app.get('/api/subscriptions/clientMembership/:id_client', passport.authenticate('jwt', { session: false }), clientSubscriptionsController.getClientMembership);

    // NUEVO — Reactivar una membresía con una fecha de vencimiento elegida
    // a mano (semana/mes/personalizado), en vez de la duración fija del plan.
    app.put('/api/subscriptions/reactivateWithDate', passport.authenticate('jwt', { session: false }), clientSubscriptionsController.reactivateWithDate);

    // NUEVO — Pausar/reanudar una membresía domiciliada, y el enlace real
    // de Stripe para reintentar un cobro vencido (ver la nota completa en
    // el controller, junto a pauseMembership).
    app.put('/api/subscriptions/pause', passport.authenticate('jwt', { session: false }), clientSubscriptionsController.pauseMembership);
    // NUEVO — reemplaza a /api/subscriptions/cancel para el panel: esa
    // reconoce mal el tipo de membresía (ver la nota en cancelMembership).
    app.put('/api/subscriptions/cancelMembership', passport.authenticate('jwt', { session: false }), clientSubscriptionsController.cancelMembership);
    // NUEVO — pasar una membresía de COBI a transferencia manual (ver la nota en el controller).
    app.put('/api/subscriptions/convertToManual', passport.authenticate('jwt', { session: false }), clientSubscriptionsController.convertToManual);
    app.put('/api/subscriptions/resume', passport.authenticate('jwt', { session: false }), clientSubscriptionsController.resumeMembership);
    app.get('/api/subscriptions/retryLink/:id_subscription', passport.authenticate('jwt', { session: false }), clientSubscriptionsController.getRetryLink);



    app.post(
        '/api/emoon/payments/create-payment-intent',
        passport.authenticate('emoon-jwt', { session: false }),
        clientSubscriptionsController.createPackagePaymentIntent
    );
};
