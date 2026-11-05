const groupChatController = require('../controllers/groupChatController.js');
const passport = require('passport');

module.exports = (app, upload) => {

    // PREFIJO: /api/group-chat — chat grupal entre entrenadores (ver
    // groupChatController.js). Mismo esquema de rutas que chatRoutes.js.

    app.post(
        '/api/group-chat/send',
        passport.authenticate('jwt', { session: false }),
        groupChatController.sendMessage
    );

    app.post(
        '/api/group-chat/uploadMedia',
        passport.authenticate('jwt', { session: false }),
        upload.single('file'),
        groupChatController.uploadMedia
    );

    app.delete(
        '/api/group-chat/deleteMessage/:messageId',
        passport.authenticate('jwt', { session: false }),
        groupChatController.deleteMessage
    );

    app.post(
        '/api/group-chat/toggleReaction',
        passport.authenticate('jwt', { session: false }),
        groupChatController.toggleReaction
    );

    app.post(
        '/api/group-chat/editMessage',
        passport.authenticate('jwt', { session: false }),
        groupChatController.editMessage
    );

    app.post(
        '/api/group-chat/markRead',
        passport.authenticate('jwt', { session: false }),
        groupChatController.markRead
    );

}
