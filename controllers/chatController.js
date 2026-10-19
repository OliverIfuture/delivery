const User = require('../models/user.js');
const admin = require('firebase-admin');
const storage = require('../utils/cloud_storage.js');
const db = require('../config/config.js');
const TrainerNotification = require('../models/trainerNotification.js');
const { sendPushToUser } = require('../utils/pushNotifications.js');

// Mismo mapa de "kind" que el panel web (ver trainer-partners/src/
// controllers/chatController.js: KNOWN_KINDS) — para que el cuerpo de la
// notificación diga algo legible ("📷 Foto") en vez del JSON crudo
// cuando el mensaje es un media/reporte en lugar de texto plano.
function friendlyNotificationBody(messageContent) {
    const trimmed = (messageContent || '').trim();
    if (!trimmed.startsWith('{')) {
        return trimmed.length > 90 ? `${trimmed.slice(0, 90)}…` : trimmed;
    }
    try {
        const parsed = JSON.parse(trimmed);
        switch (parsed.kind) {
            case 'media':
                if (parsed.mediaType === 'image') return '📷 Foto';
                if (parsed.mediaType === 'video') return '🎥 Video';
                if (parsed.mediaType === 'audio') return '🎙️ Nota de voz';
                return 'Archivo adjunto';
            case 'metrics-report': return '📊 Reporte de progreso';
            case 'photo-comparison': return '📸 Comparación de fotos';
            case 'event-reminder': return `📅 ${parsed.event?.title || 'Recordatorio'}`;
            case 'plan-card': return `${parsed.type === 'dieta' ? '🍽️' : '🏋️'} ${parsed.title || 'Plan'}`;
            default: return trimmed.length > 90 ? `${trimmed.slice(0, 90)}…` : trimmed;
        }
    } catch (_) {
        return trimmed.length > 90 ? `${trimmed.slice(0, 90)}…` : trimmed;
    }
}

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
            const { recipientId, messageContent, chatRoomId, replyTo } = req.body;

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
                isRead: false,
                // NUEVO — responder a un mensaje puntual (banner de cita en
                // la UI); null si no es una respuesta.
                replyTo: replyTo || null,
            };

            // 3. Guardar el mensaje en Firestore (Usando la NUEVA instancia de DB)
            await firestoreDb.collection('chats')
                .doc(chatRoomId)
                .collection('messages')
                .add(messageData);

            // --- NUEVO: notificación real para la campana del panel web ---
            // Si el destinatario es un entrenador (tiene mi_store), le
            // dejamos una notificación enlazada a esta conversación — el
            // panel abre /dashboard/chat?clientId=<quien mandó el mensaje>.
            try {
                const recipientRow = await db.oneOrNone(`SELECT mi_store FROM users WHERE id = $1`, [recipientId]);
                if (recipientRow && recipientRow.mi_store && String(recipientRow.mi_store) !== '0') {
                    await TrainerNotification.create({
                        id_user: recipientId,
                        type: 'message',
                        title: `Nuevo mensaje de ${senderName}`,
                        body: friendlyNotificationBody(messageContent),
                        link: `/dashboard/chat?clientId=${senderId}`
                    });
                }
            } catch (notifErr) {
                console.log(`No se pudo crear la notificación de chat: ${notifErr.message}`);
            }

            // Push real al destinatario (trainer o client, da igual — el
            // helper resuelve su notification_token sea quien sea). `peerId`
            // es con quién debe abrir el chat quien recibe el push (el que
            // mandó este mensaje), mismo contrato `type` que el resto de
            // notificaciones nuevas (ver utils/pushNotifications.js).
            sendPushToUser(recipientId, {
                title: `Nuevo mensaje de ${senderName}`,
                body: friendlyNotificationBody(messageContent),
                data: { type: 'message', peerId: senderId, chatRoomId }
            }).catch(() => {});


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

    // NUEVO — subida genérica de foto/video/audio para el chat (antes solo
    // existía uploadImage). `storage()` (utils/cloud_storage.js) ya es
    // agnóstico al mimetype — solo cambia el prefijo de carpeta para no
    // mezclar archivos de video/audio bajo "chat_images/".
    async uploadMedia(req, res, next) {
        try {
            const file = req.file;
            if (!file) {
                return res.status(400).json({ success: false, message: 'No se ha enviado ningún archivo.' });
            }

            const path = `chat_media/user_${req.user.id}_${Date.now()}`;
            const url = await storage(file, path);

            if (!url) {
                return res.status(500).json({ success: false, message: 'Error al obtener la URL del archivo.' });
            }

            return res.status(201).json({
                success: true,
                message: 'Archivo subido correctamente',
                data: url
            });
        } catch (error) {
            console.log(`Error en chatController.uploadMedia: ${error}`);
            return res.status(501).json({
                success: false,
                message: 'Error al subir el archivo',
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

    // NUEVO — 4 reacciones por mensaje (like/love/laugh/sad), una por
    // persona por mensaje (elegir otra quita la anterior). El documento
    // guarda `reactions: { like: [ids], love: [ids], laugh: [ids], sad: [ids] }`.
    async toggleReaction(req, res, next) {
        try {
            const { chatRoomId, messageId, reactionKey } = req.body;
            const validKeys = ['like', 'love', 'laugh', 'sad'];
            if (!chatRoomId || !messageId || !validKeys.includes(reactionKey)) {
                return res.status(400).json({ success: false, message: 'Faltan datos o la reacción no es válida.' });
            }
            const userId = req.user.id.toString();
            const messageRef = firestoreDb.collection('chats').doc(chatRoomId).collection('messages').doc(messageId);
            const doc = await messageRef.get();
            if (!doc.exists) {
                return res.status(404).json({ success: false, message: 'El mensaje no existe.' });
            }
            const current = doc.data().reactions || {};
            const next = {};
            let hadThisReaction = false;
            for (const key of validKeys) {
                const list = Array.isArray(current[key]) ? current[key].filter((id) => id.toString() !== userId) : [];
                if (key === reactionKey && Array.isArray(current[key]) && current[key].map(String).includes(userId)) {
                    hadThisReaction = true;
                }
                next[key] = list;
            }
            if (!hadThisReaction) {
                next[reactionKey] = [...next[reactionKey], userId];
            }
            await messageRef.update({ reactions: next });
            return res.status(200).json({ success: true, reactions: next });
        } catch (error) {
            console.log(`Error en chatController.toggleReaction: ${error}`);
            return res.status(501).json({ success: false, message: 'Error al reaccionar al mensaje', error: error.message });
        }
    },

    // NUEVO — editar un mensaje propio (marca editedAt, la UI muestra
    // "Editado · {hora}").
    async editMessage(req, res, next) {
        try {
            const { chatRoomId, messageId, content } = req.body;
            if (!chatRoomId || !messageId || !content || !content.trim()) {
                return res.status(400).json({ success: false, message: 'Falta contenido.' });
            }
            const messageRef = firestoreDb.collection('chats').doc(chatRoomId).collection('messages').doc(messageId);
            const doc = await messageRef.get();
            if (!doc.exists) {
                return res.status(404).json({ success: false, message: 'El mensaje no existe.' });
            }
            if (doc.data().senderId.toString() !== req.user.id.toString()) {
                return res.status(403).json({ success: false, message: 'No puedes editar este mensaje.' });
            }
            await messageRef.update({ content: content.trim(), editedAt: admin.firestore.Timestamp.now() });
            return res.status(200).json({ success: true });
        } catch (error) {
            console.log(`Error en chatController.editMessage: ${error}`);
            return res.status(501).json({ success: false, message: 'Error al editar el mensaje', error: error.message });
        }
    },
};
