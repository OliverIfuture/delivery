const User = require('../models/user.js'); 
const admin = require('firebase-admin'); 

// --- ¡AQUÍ ESTÁ LA SOLUCIÓN! ---

// 1. Carga las credenciales desde la VARIABLE DE ENTORNO de Heroku
const serviceAccountChatJSON = process.env.FIREBASE_CHAT_CREDS; 
let serviceAccountChat;
let firestoreDb;
let messaging;

try {
  if (serviceAccountChatJSON) {
    serviceAccountChat = JSON.parse(serviceAccountChatJSON);
    
    // **LA LÍNEA DE CORRECCIÓN CLAVE:**
    // Reemplaza el texto '\\n' por un salto de línea real '\n'
    serviceAccountChat.private_key = serviceAccountChat.private_key.replace(/\\n/g, '\n');
    
  } else {
    throw new Error('La variable de entorno FIREBASE_CHAT_CREDS no está configurada.');
  }
} catch (e) {
  console.error('!!!!!!!!!! ERROR FATAL AL INICIALIZAR FIREBASE CHAT !!!!!!!!!!');
  console.error(e);
  // Si esto falla, las variables de abajo serán 'undefined' y el app crasheará.
}


// 2. Inicializa una SEGUNDA app de Firebase con un nombre único
let chatApp;
if (admin.apps.some(app => app.name === 'chatApp')) {
    chatApp = admin.app('chatApp');
} else {
    // Si no existe, la crea
    chatApp = admin.initializeApp({
      credential: admin.credential.cert(serviceAccountChat) // Ahora 'serviceAccountChat' está corregido
    }, 'chatApp');
}

// 3. Obtén las instancias de Firestore y Messaging desde la NUEVA app
firestoreDb = chatApp.firestore();
messaging = chatApp.messaging();

// --- FIN DE LA SOLUCIÓN ---


module.exports = {

    /**
     * Recibe un mensaje, lo guarda en Firestore y envía una notificación push.
     */
    async sendMessage(req, res, next) {
        try {
            // Log de depuración
            console.log('--- ID DEL PROYECTO FIRESTORE (sendMessage):', firestoreDb.app.options.credential.projectId);

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
