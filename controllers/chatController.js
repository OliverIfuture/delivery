const User = require('../models/user.js'); 
const admin = require('firebase-admin'); // Para Firestore y Notificaciones

module.exports = {

    /**
     * Recibe un mensaje, lo guarda en Firestore y envía una notificación push.
     */
    async sendMessage(req, res, next) {
        try {
            // 1. Obtener datos de la solicitud
            const { recipientId, messageContent, chatRoomId } = req.body;
            
            // Datos del remitente (vienen del token JWT)
            const senderId = req.user.id;
            const senderName = req.user.name;
            const senderRole = req.user.mi_store ? 'trainer' : 'client';

            if (!recipientId || !messageContent || !chatRoomId) {
                return res.status(400).json({
                    success: false,
                    message: 'Faltan datos (recipientId, messageContent, chatRoomId).'
                });
            }

            // 2. Preparar el objeto del mensaje para Firestore
            const messageData = {
                senderId: senderId,
                senderName: senderName,
                receiverId: recipientId,
                content: messageContent,
                timestamp: admin.firestore.Timestamp.now(), // Usar el timestamp del servidor
                senderRole: senderRole,
            };

            // 3. Guardar el mensaje en Firestore
            const db = admin.firestore();
            await db.collection('chats')
                    .doc(chatRoomId)
                    .collection('messages')
                    .add(messageData);

            // 4. Obtener el Token de Notificación del destinatario
            const recipientToken = await User.findNotificationToken(recipientId);

            if (recipientToken) {
                // 5. Enviar la notificación push
                const payload = {
                    notification: {
                        title: `Nuevo mensaje de ${senderName}`,
                        body: messageContent,
                    },
                    data: {
                        // (Opcional) Puedes enviar datos extra aquí
                        // para que la app sepa qué chat abrir al tocar la notificación
                        'click_action': 'FLUTTER_NOTIFICATION_CLICK',
                        'screen': '/chat',
                        'chatRoomId': chatRoomId,
                    }
                };
                
                await admin.messaging().sendToDevice(recipientToken, payload);
                console.log(`Notificación enviada a ${recipientId}`);
            } else {
                console.log(`No se encontró token de notificación para el usuario ${recipientId}. Mensaje guardado pero no enviado.`);
            }
            
            // 6. Devolver éxito
            return res.status(201).json({
                success: true,
                message: 'Mensaje enviado correctamente.'
            });

        } catch (error) {
            console.log(`Error en chatController.sendMessage: ${error}`);
            return res.status(501).json({
                success: false,
                message: 'Error al enviar el mensaje',
                error: error.message
            });
        }
    },
};
