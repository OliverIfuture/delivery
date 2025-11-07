const User = require('../models/user.js'); 
const admin = require('firebase-admin'); // Importamos 'admin'

// --- ¡AQUÍ ESTÁ LA SOLUCIÓN! ---

// 1. Carga las credenciales desde la VARIABLE DE ENTORNO de Heroku
// (Esto evita subir el archivo JSON a GitHub)
const serviceAccountChatJSON = process.env.FIREBASE_CHAT_CREDS; 
let serviceAccountChat;

try {
  if (serviceAccountChatJSON) {
    serviceAccountChat = JSON.parse(serviceAccountChatJSON);
  } else {
    throw new Error('La variable de entorno FIREBASE_CHAT_CREDS no está configurada.');
  }
} catch (e) {
  console.error('Error al parsear las credenciales de Firebase Chat:', e);
  console.error('Asegúrate de copiar el JSON completo en la Config Var de Heroku.');
}


// 2. Inicializa una SEGUNDA app de Firebase con un nombre único
// (Tu app 'default' de server.js se seguirá usando para el storage)
let chatApp;
if (admin.apps.some(app => app.name === 'chatApp')) {
    // Si ya existe (ej. por un hot-reload), simplemente la obtiene
    chatApp = admin.app('chatApp');
} else {
    // Si no existe, la crea
    chatApp = admin.initializeApp({
      credential: admin.credential.cert(serviceAccountChat)
    }, 'chatApp');
}

// 3. Obtén las instancias de Firestore y Messaging desde la NUEVA app
const firestoreDb = chatApp.firestore();
const messaging = chatApp.messaging();

// --- FIN DE LA SOLUCIÓN ---


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

            // 3. Guardar el mensaje en Firestore (Usando la NUEVA instancia de DB)
            await firestoreDb.collection('chats')
                    .doc(chatRoomId)
                    .collection('messages')
                    .add(messageData);

            // 4. Obtener el Token de Notificación del destinatario
            const recipientToken = await User.findNotificationToken(recipientId);

            if (recipientToken) {
                // 5. Enviar la notificación push (Usando la NUEVA instancia de Messaging)
                const payload = {
                    notification: {
                        title: `Nuevo mensaje de ${senderName}`,
                        body: messageContent,
                    },
                    data: {
                        'click_action': 'FLUTTER_NOTIFICATION_CLICK',
                        'screen': '/chat',
                        'chatRoomId': chatRoomId,
                        'senderId': senderId,
                        'recipientId': recipientId
                    }
                };
                
                await messaging.sendToDevice(recipientToken, payload);
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
