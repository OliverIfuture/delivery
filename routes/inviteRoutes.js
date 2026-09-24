// routes/inviteRoutes.js
//
// NUEVO — enlace real de invitación de cliente (ver controllers/inviteController.js).
// /link y /send requieren sesión del entrenador; /resolve y /accept son
// públicas porque las visita alguien que todavía no tiene cuenta.
const passport = require('passport');
const InviteController = require('../controllers/inviteController.js');

module.exports = (app) => {
    app.get('/api/invite/link', passport.authenticate('jwt', { session: false }), InviteController.getMyInviteLink);
    app.post('/api/invite/send', passport.authenticate('jwt', { session: false }), InviteController.sendClientInvite);
    app.get('/api/invite/resolve/:token', InviteController.resolveInvite);
    app.post('/api/invite/accept', InviteController.acceptInvite);
};
