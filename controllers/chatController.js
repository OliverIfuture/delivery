const User = require('../models/user.js'); 
const admin = require('firebase-admin'); 

// --- ¡LÓGICA DE INICIALIZACIÓN DEPURADA! ---

// 1. Carga las credenciales desde la VARIABLE DE ENTORNO de Heroku
const serviceAccountChatJSON = process.env.FIREBASE_CHAT_CREDS; 
let serviceAccountChat;
let firestoreDb;
let messaging;

try {
  if (serviceAccountChatJSON) {
    serviceAccountChat = JSON.parse(serviceAccountChatJSON);
  } else {
    // Si no hay credenciales de chat, el servidor no puede arrancar
    throw new Error('¡CRÍTICO! La variable de entorno FIREBASE_CHAT_CREDS no está configurada.');
  }

  // 2. Inicializa una SEGUNDA app de Firebase con un nombre único
  let chatApp;
  if (admin.apps.some(app => app.name === 'chatApp')) {
      chatApp = admin.app('chatApp');
      console.log('--- chatApp de Firebase REUTILIZADA ---');
  } else {
      chatApp = admin.initializeApp({
        credential: admin.credential.cert(serviceAccountChat)
      }, 'chatApp');
      console.log('--- chatApp de Firebase INICIALIZADA POR PRIMERA VEZ ---');
  }

  // 3. Obtén las instancias de Firestore y Messaging desde la NUEVA app
  firestoreDb = chatApp.firestore();
  messaging = chatApp.messaging();

} catch (e) {
    console.error('!!!!!!!!!! ERROR FATAL AL INICIALIZAR FIREBASE CHAT !!!!!!!!!!');
    console.error(e);
    // Si falla aquí, las variables firestoreDb y messaging serán 'undefined'
    // y el controlador fallará (lo cual es bueno, porque nos avisa)
}
// --- FIN DE LA LÓGICA DE INICIALIZACIÓN ---


module.exports = {

    /**
     * Recibe un mensaje, lo guarda en Firestore y envía una notificación push.
     */
    async sendMessage(req, res, next) {
        try {
            // **LOG DE DEPURACIÓN CLAVE**
            // Verifiquemos con qué proyecto se inicializó esta instancia de firestore
            console.log('--- ID DEL PROYECTO FIRESTORE (sendMessage):', firestoreDb.app.options.credential.projectId);

            // 1. Obtener datos de la solicitud
            const { recipientId, messageContent, chatRoomId } = req.body;
            
            // ... (resto de tu lógica de sendMessage) ...
            
            const senderId = req.user.id;
            const senderName = req.user.name;
            const senderRole = req.user.mi_store ? 'trainer' : 'client';

            if (!recipientId || !messageContent || !chatRoomId) {
                return res.status(400).json({
                    success: false,
                    message: 'Faltan datos (recipientId, messageContent, chatRoomId).'
                });
            }

            const messageData = {
                senderId: senderId,
                senderName: senderName,
                receiverId: recipientId,
                content: messageContent,
                timestamp: admin.firestore.Timestamp.now(), 
                senderRole: senderRole,
            };

            await firestoreDb.collection('chats')
                    .doc(chatRoomId)
                    .collection('messages')
                    .add(messageData);

            const recipientToken = await User.findNotificationToken(recipientId);

            if (recipientToken) {
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
