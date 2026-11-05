// controllers/groupChatController.js
//
// Chat grupal entre TODOS los entrenadores que tienen tienda (mi_store) —
// una sola sala fija (GROUP_CHAT_ROOM_ID), a diferencia del chat 1:1
// (chatController.js) que usa una sala por par de usuarios
// (createChatRoomId). Mismo Firestore/app 'chatApp' (ver
// utils/chatFirebaseAdmin.js), mismo criterio de "escribir siempre vía
// backend, leer directo desde el navegador" que el chat 1:1.
//
// Decisión de producto (confirmada con el usuario): NO se manda push ni
// se crea TrainerNotification por cada mensaje — con potencialmente
// cientos de entrenadores en una sola sala sería spam. El contador de
// "no leídos" del menú lateral se resuelve aparte, leyendo directo
// Firestore desde el frontend (ver useGroupChatUnread.js), comparando
// contra el doc de lectura que sí escribe este controller (markRead).
const admin = require('firebase-admin');
const storage = require('../utils/cloud_storage.js');
const db = require('../config/config.js');
const { firestoreDb } = require('../utils/chatFirebaseAdmin.js');

const GROUP_CHAT_ROOM_ID = 'entrenadores';

// Mismo correo admin que ya modera el feed de Coach Community (ver
// COACH_COMMUNITY_ADMIN_EMAIL en coachCommunityController.js) — acá
// puede borrar cualquier mensaje, no solo los propios.
const GROUP_CHAT_ADMIN_EMAIL = 'coach.community@thetrainer-app.com';

function messagesRef() {
    return firestoreDb.collection('group_chats').doc(GROUP_CHAT_ROOM_ID).collection('messages');
}
function readsRef() {
    return firestoreDb.collection('group_chats').doc(GROUP_CHAT_ROOM_ID).collection('reads');
}
function isAdmin(req) {
    return (req.user.email || '').trim().toLowerCase() === GROUP_CHAT_ADMIN_EMAIL;
}
// mi_store en 0 (no null) para quien nunca tuvo tienda es un caso real
// (confirmado en producción con una cuenta de prueba) — pg-promise lo
// regresa como el STRING "0" para algunas columnas numéricas, y "0" es
// truthy en JS, así que un `if (!req.user.mi_store)` simple no bastaba.
// Mismo chequeo que ya usa chatController.sendMessage para el mismo caso.
function hasStore(req) {
    return !!req.user.mi_store && String(req.user.mi_store) !== '0';
}

module.exports = {

    /**
     * Manda un mensaje a la sala compartida. Solo entrenadores con tienda
     * (mi_store) pueden escribir — req.user.mi_store ya viene poblado por
     * el JWT (User.findById en config/passport.js lo selecciona).
     */
    async sendMessage(req, res, next) {
        try {
            if (!hasStore(req)) {
                return res.status(403).json({ success: false, message: 'Solo entrenadores con tienda pueden escribir en el chat grupal.' });
            }

            const { messageContent, replyTo } = req.body;
            if (!messageContent) {
                return res.status(400).json({ success: false, message: 'Falta el contenido del mensaje.' });
            }

            // Nombre de la tienda del remitente, denormalizado en el mensaje
            // para no tener que hacer join al pintar cada burbuja — en una
            // sala con muchos entrenadores, eso sería un query por mensaje.
            const companyRow = await db.oneOrNone(`SELECT name FROM company WHERE id = $1`, [req.user.mi_store]);

            const messageData = {
                senderId: req.user.id,
                senderName: req.user.name,
                senderPhoto: req.user.image || null,
                senderCompany: companyRow?.name || null,
                content: messageContent,
                timestamp: admin.firestore.Timestamp.now(),
                reactions: { like: [], love: [], laugh: [], sad: [] },
                replyTo: replyTo || null,
            };

            await messagesRef().add(messageData);

            return res.status(201).json({ success: true, message: 'Mensaje enviado correctamente.' });
        } catch (error) {
            console.log(`Error en groupChatController.sendMessage: ${error}`);
            return res.status(501).json({ success: false, message: 'Error al enviar el mensaje', error: error.message });
        }
    },

    // Subida genérica de foto/video/audio — mismo helper storage() que el
    // chat 1:1 (utils/cloud_storage.js, agnóstico al mimetype), solo con
    // otro prefijo de carpeta para no mezclar archivos.
    async uploadMedia(req, res, next) {
        try {
            if (!hasStore(req)) {
                return res.status(403).json({ success: false, message: 'Solo entrenadores con tienda pueden escribir en el chat grupal.' });
            }

            const file = req.file;
            if (!file) {
                return res.status(400).json({ success: false, message: 'No se ha enviado ningún archivo.' });
            }

            const path = `group_chat_media/user_${req.user.id}_${Date.now()}`;
            const url = await storage(file, path);

            if (!url) {
                return res.status(500).json({ success: false, message: 'Error al obtener la URL del archivo.' });
            }

            return res.status(201).json({ success: true, message: 'Archivo subido correctamente', data: url });
        } catch (error) {
            console.log(`Error en groupChatController.uploadMedia: ${error}`);
            return res.status(501).json({ success: false, message: 'Error al subir el archivo', error: error.message });
        }
    },

    // El autor borra su propio mensaje; el admin de Coach Community puede
    // borrar cualquiera (moderación).
    async deleteMessage(req, res, next) {
        try {
            const { messageId } = req.params;
            const messageRef = messagesRef().doc(messageId);
            const doc = await messageRef.get();

            if (!doc.exists) {
                return res.status(404).json({ success: false, message: 'El mensaje no existe.' });
            }

            const messageData = doc.data();
            const isOwner = messageData.senderId.toString() === req.user.id.toString();
            if (!isOwner && !isAdmin(req)) {
                return res.status(403).json({ success: false, message: 'No tienes permiso para eliminar este mensaje.' });
            }

            await messageRef.delete();
            return res.status(200).json({ success: true, message: 'Mensaje eliminado para todos.' });
        } catch (error) {
            console.log(`Error en groupChatController.deleteMessage: ${error}`);
            return res.status(501).json({ success: false, message: 'Error al eliminar mensaje', error: error.message });
        }
    },

    // Mismo esquema de 4 reacciones que el chat 1:1 (ver toggleReaction en
    // chatController.js) — una por persona por mensaje.
    async toggleReaction(req, res, next) {
        try {
            const { messageId, reactionKey } = req.body;
            const validKeys = ['like', 'love', 'laugh', 'sad'];
            if (!messageId || !validKeys.includes(reactionKey)) {
                return res.status(400).json({ success: false, message: 'Faltan datos o la reacción no es válida.' });
            }
            const userId = req.user.id.toString();
            const messageRef = messagesRef().doc(messageId);
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
            console.log(`Error en groupChatController.toggleReaction: ${error}`);
            return res.status(501).json({ success: false, message: 'Error al reaccionar al mensaje', error: error.message });
        }
    },

    // Editar un mensaje propio (marca editedAt).
    async editMessage(req, res, next) {
        try {
            const { messageId, content } = req.body;
            if (!messageId || !content || !content.trim()) {
                return res.status(400).json({ success: false, message: 'Falta contenido.' });
            }
            const messageRef = messagesRef().doc(messageId);
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
            console.log(`Error en groupChatController.editMessage: ${error}`);
            return res.status(501).json({ success: false, message: 'Error al editar el mensaje', error: error.message });
        }
    },

    // Marca "leído hasta ahora" para este usuario — único escritor del doc
    // de lectura (ver useGroupChatUnread.js en el frontend, que lo LEE
    // directo de Firestore para calcular el contador del sidebar).
    async markRead(req, res, next) {
        try {
            await readsRef().doc(String(req.user.id)).set({ lastReadAt: admin.firestore.Timestamp.now() });
            return res.status(200).json({ success: true });
        } catch (error) {
            console.log(`Error en groupChatController.markRead: ${error}`);
            return res.status(501).json({ success: false, message: 'Error al marcar como leído', error: error.message });
        }
    },
};
