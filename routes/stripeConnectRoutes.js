const stripeConnectController = require('../controllers/stripeConnectController.js');
const passport = require('passport');

module.exports = (app) => {

    // PREFIJO: /api/stripe

    /**
     * POST: /api/stripe/connect/onboard-account
     * * Inicia el proceso de onboarding.
     * 1. Crea una Cuenta Express en Stripe si no existe.
     * 2. Guarda el ID de la cuenta (acct_...) en nuestra tabla 'company'.
     * 3. Crea y devuelve un "Account Link" (URL) de un solo uso.
     * La app de Flutter abrirá esta URL en un WebView.
     */
    app.post(
        '/api/stripe/connect/onboard-account',
        passport.authenticate('jwt', { session: false }),
        stripeConnectController.createConnectAccount
    );

    app.post(
        '/api/cobi/stripe/connect/onboard',
        passport.authenticate('cobi-jwt', { session: false }),
        stripeConnectController.cobiCreateConnectAccount
    );

    /**
     * GET: /api/stripe/connect/account-status
     * * La app llama a esto después de que el WebView se cierra
     * para verificar si el onboarding fue exitoso.
     */
    app.get(
        '/api/stripe/connect/account-status',
        passport.authenticate('jwt', { session: false }),
        stripeConnectController.getAccountStatus
    );

    app.get(
        '/api/cobi/stripe/connect/status',
        passport.authenticate('cobi-jwt', { session: false }),
        stripeConnectController.cobiGetAccountStatus
    );

    /**
     * GET: /api/stripe/connect/charges/:id_account
     * * Obtiene la lista de transacciones de una cuenta conectada
     */
    app.get(
        '/api/stripe/connect/charges/:id_account',
        passport.authenticate('jwt', { session: false }),
        stripeConnectController.getChargesList
    );

    app.get(
        '/api/cobi/stripe/connect/transactions/:id_account',
        passport.authenticate('cobi-jwt', { session: false }),
        stripeConnectController.cobiGetTransactionsList
    );

    app.post('/api/cobi/stripe/create-setup-intent', passport.authenticate('cobi-jwt', { session: false }), stripeConnectController.createSetupIntent);
    app.get('/api/cobi/stripe/get-payment-methods', passport.authenticate('cobi-jwt', { session: false }), stripeConnectController.getPaymentMethods);
}
