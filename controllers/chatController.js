const User = require('../models/user.js'); 
const admin = require('firebase-admin'); 
const storage = require('../utils/cloud_storage.js');

// --- ¡LÓGICA DE INICIALIZACIÓN (LA DEJAREMOS IGUAL)! ---
let serviceAccountChat;
let firestoreDb;
let messaging;

try {
  // Leemos las 3 variables de Heroku
  const projectId = process.env.FIREBASE_CHAT_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CHAT_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_CHAT_PRIVATE_KEY.replace(/\\n/g, '\n');

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error('Faltan las variables de entorno de Firebase Chat (PROJECT_ID, CLIENT_EMAIL, o PRIVATE_KEY).');
  }

  serviceAccountChat = {
    projectId: projectId,
    clientEmail: clientEmail,
    privateKey: privateKey
  };

  let chatApp;
  if (admin.apps.some(app => app.name === 'chatApp')) {
      chatApp = admin.app('chatApp');
  } else {
      chatApp = admin.initializeApp({
        credential: admin.credential.cert(serviceAccountChat)
      }, 'chatApp');
  }

  firestoreDb = chatApp.firestore();
  messaging = chatApp.messaging();
  
  console.log(`--- chatApp de Firebase inicializada con ÉXITO para el proyecto: ${projectId} ---`);

} catch (e) {
  console.error('!!!!!!!!!! ERROR FATAL AL INICIALIZAR FIREBASE CHAT !!!!!!!!!!');
  console.error(e);
}
// --- FIN DE LA LÓGICA DE INICIALIZACIÓN ---


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

            // --- **PRUEBA DE DEPURACIÓN: NOTIFICACIONES DESACTIVADAS TEMPORALMENTE** ---
            
            // 4. Obtener el Token de Notificación del destinatario
            // const recipientToken = await User.findNotificationToken(recipientId);

            // if (recipientToken) {
            //     // 5. Enviar la notificación push (Usando la NUEVA instancia de Messaging)
            //     const payload = {
            //         notification: {
            //             title: `Nuevo mensaje de ${senderName}`,
            //             body: messageContent,
            //         },
            //         data: {
            //             'click_action': 'FLUTTER_NOTIFICATION_CLICK',
            //             'screen': '/chat',
            //             'chatRoomId': chatRoomId,
            //             'senderId': senderId,
            //             'recipientId': recipientId
            //         }
            //     };
                
            //     await messaging.sendToDevice(recipientToken, payload);
            //     console.log(`Notificación enviada a ${recipientId}`);
            // } else {
            //     console.log(`No se encontró token de notificación para el usuario ${recipientId}. Mensaje guardado pero no enviado.`);
            // }
            
            console.log('Mensaje guardado en Firestore. Notificaciones omitidas para depuración.');
            // --- **FIN DE LA PRUEBA DE DEPURACIÓN** ---


            // 6. Devolver éxito
            return res.status(201).json({
                success: true,
                message: 'Mensaje enviado correctamente.'
            });

        } catch (error) {
            // Si el error 404 persiste, significa que 'firestoreDb.collection(...)' está fallando.
            console.log(`Error en chatController.sendMessage: ${error}`);
            return res.status(501).json({
                success: false,
                message: 'Error al enviar el mensaje',
                error: error.message
            });
        }
    },

  async uploadImage(req, res, next) {
        try {
            const files = req.files;

            if (files.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'No se ha enviado ninguna imagen.'
                });
            }

            // Generar un path único para la imagen del chat
            // Ej: chat_images/senderId_timestamp
            const path = `chat_images/user_${req.user.id}_${Date.now()}`;
            
            // Usamos tu utilidad 'storage' existente
            const url = await storage(files[0], path);

            if (url != undefined && url != null) {
                return res.status(201).json({
                    success: true,
                    message: 'Imagen subida correctamente',
                    data: url // Retornamos la URL pública
                });
            } else {
                return res.status(500).json({
                    success: false,
                    message: 'Error al obtener la URL de la imagen.'
                });
            }

        } catch (error) {
            console.log(`Error en chatController.uploadImage: ${error}`);
            return res.status(501).json({
                success: false,
                message: 'Error al subir la imagen',
                error: error.message
            });
        }
    },

  // ... otras funciones ...

    async deleteMessage(req, res, next) {
        try {
            const { chatRoomId, messageId } = req.params;
            const userId = req.user.id; // ID del usuario que solicita borrar

            const messageRef = firestoreDb.collection('chats')
                                          .doc(chatRoomId)
                                          .collection('messages')
                                          .doc(messageId);

            const doc = await messageRef.get();

            if (!doc.exists) {
                return res.status(404).json({ success: false, message: 'El mensaje no existe.' });
            }

            const messageData = doc.data();

            // SEGURIDAD: Solo el remitente puede borrar su propio mensaje
            // Convertimos a String para asegurar la comparación
            if (messageData.senderId.toString() !== userId.toString()) {
                return res.status(403).json({ success: false, message: 'No tienes permiso para eliminar este mensaje.' });
            }

            // Eliminar de Firestore
            await messageRef.delete();

            // (Opcional) Si quisieras borrar la imagen de Storage, aquí llamarías a tu utilidad de borrado de archivos
            // usando messageData.content si es una URL de imagen.

            return res.status(200).json({
                success: true,
                message: 'Mensaje eliminado para todos.'
            });

        } catch (error) {
            console.log(`Error en deleteMessage: ${error}`);
            return res.status(501).json({
                success: false,
                message: 'Error al eliminar mensaje',
                error: error.message
            });
        }
    },
};
