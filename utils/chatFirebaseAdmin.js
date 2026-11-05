// utils/chatFirebaseAdmin.js
//
// Inicialización de la Firebase Admin app 'chatApp' (proyecto aparte de
// chat, variables FIREBASE_CHAT_*) — antes vivía duplicable dentro de
// controllers/chatController.js. Se extrajo acá para que tanto el chat
// 1:1 (chatController.js) como el chat grupal (groupChatController.js)
// compartan la MISMA instancia de Firestore sin volver a inicializar la
// app (admin.initializeApp con el mismo nombre dos veces truena).
const admin = require('firebase-admin');

let firestoreDb;
let messaging;

try {
    const projectId = process.env.FIREBASE_CHAT_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CHAT_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_CHAT_PRIVATE_KEY.replace(/\\n/g, '\n');

    if (!projectId || !clientEmail || !privateKey) {
        throw new Error('Faltan las variables de entorno de Firebase Chat (PROJECT_ID, CLIENT_EMAIL, o PRIVATE_KEY).');
    }

    const serviceAccountChat = { projectId, clientEmail, privateKey };

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

module.exports = { firestoreDb, messaging };
