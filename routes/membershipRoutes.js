const membershipController = require('../controllers/membershipController.js');
const passport = require('passport');

module.exports = (app, upload) => {

    // PREFIJO: /api/membership — planes reales de la plataforma (lo que
    // paga un entrenador para usar Trainer Partners).

    // Público — se muestra durante el registro, antes de tener cuenta.
    app.get('/api/membership/plans', membershipController.getPublicPlans);

    // Requieren sesión — se llaman justo después de crear la cuenta
    // (ver RegisterTrainerFlow.vue), ya logueado.
    app.post('/api/membership/checkout', passport.authenticate('jwt', { session: false }), membershipController.createCheckout);
    app.post('/api/membership/confirm', passport.authenticate('jwt', { session: false }), membershipController.confirmPayment);

    // NUEVO — panel de Configuración (Perfil/Apariencia/Suscripción real).
    app.get('/api/membership/profile', passport.authenticate('jwt', { session: false }), membershipController.getMyProfile);
    app.post(
        '/api/membership/profile',
        passport.authenticate('jwt', { session: false }),
        upload.fields([{ name: 'image', maxCount: 1 }, { name: 'logo', maxCount: 1 }]),
        membershipController.updateMyProfile
    );
    app.post('/api/membership/appearance', passport.authenticate('jwt', { session: false }), membershipController.updateMyAppearance);
    app.get('/api/membership/status', passport.authenticate('jwt', { session: false }), membershipController.getMyMembershipStatus);
    app.get('/api/membership/payment-method', passport.authenticate('jwt', { session: false }), membershipController.getMyPaymentMethod);
    app.post('/api/membership/payment-method/setup-intent', passport.authenticate('jwt', { session: false }), membershipController.createCardUpdateIntent);
    app.post('/api/membership/payment-method/confirm', passport.authenticate('jwt', { session: false }), membershipController.confirmCardUpdate);
    app.get('/api/membership/invoices', passport.authenticate('jwt', { session: false }), membershipController.getMyInvoices);
    app.post('/api/membership/change-plan', passport.authenticate('jwt', { session: false }), membershipController.changeMyPlan);
    app.get('/api/membership/addons', passport.authenticate('jwt', { session: false }), membershipController.getAddons);
    app.post('/api/membership/addons/activate', passport.authenticate('jwt', { session: false }), membershipController.activateAddon);
    app.post('/api/membership/addons/deactivate', passport.authenticate('jwt', { session: false }), membershipController.deactivateAddon);

};
