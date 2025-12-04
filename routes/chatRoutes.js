const chatController = require('../controllers/chatController.js');
const passport = require('passport');

module.exports = (app, upload) => {

    // PREFIJO: /api/chat
    
    /**
     * POST: /api/chat/send
     * Reemplaza la escritura directa a Firestore desde Flutter.
     * 1. Guarda el mensaje en Firestore.
     * 2. Busca el token de notificación del destinatario.
     * 3. Envía la notificación push.
     */
    app.post(
        '/api/chat/send', 
        passport.authenticate('jwt', { session: false }), 
        chatController.sendMessage
    );

    app.post(
        '/api/chat/uploadImage',
        passport.authenticate('jwt', { session: false }), // Seguridad
        upload.array('image', 1), // Multer procesa el archivo
        ChatController.uploadImage
    );

}
