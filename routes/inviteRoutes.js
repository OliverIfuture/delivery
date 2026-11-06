// routes/inviteRoutes.js
//
// NUEVO — enlace real de invitación de cliente (ver controllers/inviteController.js).
// /link y /send requieren sesión del entrenador; /resolve y /accept son
// públicas porque las visita alguien que todavía no tiene cuenta.
const passport = require('passport');
const InviteController = require('../controllers/inviteController.js');

module.exports = (app, upload) => {
    app.get('/api/invite/link', passport.authenticate('jwt', { session: false }), InviteController.getMyInviteLink);
    app.post('/api/invite/send', passport.authenticate('jwt', { session: false }), InviteController.sendClientInvite);
    app.get('/api/invite/resolve/:token', InviteController.resolveInvite);
    app.get('/api/invite/pending-mine', passport.authenticate('jwt', { session: false }), InviteController.getPendingForMe);
    app.post('/api/invite/accept-mine', passport.authenticate('jwt', { session: false }), InviteController.acceptPendingForMe);
    // multipart (igual que /api/users/create) — ahora pide teléfono
    // obligatorio y acepta una foto opcional, ver acceptInvite.
    app.post('/api/invite/accept', upload.array('image', 1), InviteController.acceptInvite);

    // NUEVO — mismas rutas pero con el límite de clientes del plan
    // aplicado de verdad (ver sendClientInviteChecked/acceptInviteChecked
    // en el controller) — el frontend web ya usa estas, las de arriba se
    // quedan intactas sin usarse desde ahí.
    app.post('/api/invite/send-checked', passport.authenticate('jwt', { session: false }), InviteController.sendClientInviteChecked);
    app.post('/api/invite/accept-checked', upload.array('image', 1), InviteController.acceptInviteChecked);
};
