const trainerNotificationsController = require('../controllers/trainerNotificationsController.js');
const passport = require('passport');

module.exports = (app) => {

    // PREFIJO: /api/notifications — campana real del panel web (ver
    // models/trainerNotification.js para dónde se crean).
    app.get('/api/notifications', passport.authenticate('jwt', { session: false }), trainerNotificationsController.list);
    app.get('/api/notifications/unread-count', passport.authenticate('jwt', { session: false }), trainerNotificationsController.unreadCount);
    app.post('/api/notifications/:id/read', passport.authenticate('jwt', { session: false }), trainerNotificationsController.markRead);
    app.post('/api/notifications/read-all', passport.authenticate('jwt', { session: false }), trainerNotificationsController.markAllRead);

};
