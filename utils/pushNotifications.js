// utils/pushNotifications.js
//
// Envío real de push (FCM) desde el servidor — único lugar que debe mandar
// notificaciones push de verdad. Antes esto se intentaba del lado del
// cliente (ver flutter_delivery_v2/lib/src/provider/notificaiones.dart,
// que llega a traer una llave de service account completa incrustada en
// el código Dart — un secreto real filtrado en el binario de la app). Acá
// se reutilizan las credenciales de servidor que YA existen para el chat
// (mismas variables de entorno FIREBASE_CHAT_*, ver chatController.js),
// vía una app de Firebase con nombre propio para no pelearse con esa
// inicialización si este módulo se carga antes o después.
const admin = require('firebase-admin');
const User = require('../models/user.js');

let messaging = null;
let initTried = false;

function getMessaging() {
    if (messaging) return messaging;
    if (initTried) return null;
    initTried = true;
    try {
        const projectId = process.env.FIREBASE_CHAT_PROJECT_ID;
        const clientEmail = process.env.FIREBASE_CHAT_CLIENT_EMAIL;
        const privateKey = process.env.FIREBASE_CHAT_PRIVATE_KEY && process.env.FIREBASE_CHAT_PRIVATE_KEY.replace(/\\n/g, '\n');

        if (!projectId || !clientEmail || !privateKey) {
            throw new Error('Faltan las variables de entorno de Firebase Chat (PROJECT_ID, CLIENT_EMAIL, o PRIVATE_KEY).');
        }

        let chatApp;
        if (admin.apps.some(app => app.name === 'chatApp')) {
            chatApp = admin.app('chatApp');
        } else {
            chatApp = admin.initializeApp({
                credential: admin.credential.cert({ projectId, clientEmail, privateKey })
            }, 'chatApp');
        }
        messaging = chatApp.messaging();
        return messaging;
    } catch (e) {
        console.error('No se pudo inicializar Firebase para push:', e.message);
        return null;
    }
}

/**
 * Manda un push real a un usuario por su id — resuelve su token guardado
 * (users.notification_token) y lo manda vía FCM. Nunca truena el flujo que
 * lo llama: cualquier falla (sin token, Firebase caído, token inválido)
 * solo se loguea.
 *
 * `data` debe ser plano (string/number/boolean) — FCM solo acepta valores
 * string en el payload `data`, así que aquí se convierte todo a String().
 */
async function sendPushToUser(id_user, { title, body, data = {} }) {
    try {
        if (!id_user) return;
        const token = await User.findNotificationToken(id_user);
        if (!token) return;

        const m = getMessaging();
        if (!m) return;

        const stringData = {};
        Object.entries(data).forEach(([k, v]) => {
            if (v !== null && v !== undefined) stringData[k] = String(v);
        });

        await m.send({
            token,
            notification: { title, body: body || '' },
            data: stringData,
            android: { priority: 'high' },
            apns: { payload: { aps: { sound: 'default' } } }
        });
    } catch (err) {
        // Un token viejo/desinstalado da 'messaging/registration-token-not-registered'
        // — no es un error real que haya que tronar ni reintentar.
        console.log(`No se pudo enviar push a ${id_user}: ${err.message}`);
    }
}

module.exports = { sendPushToUser };
