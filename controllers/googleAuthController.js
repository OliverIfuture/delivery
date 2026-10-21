// controllers/googleAuthController.js
//
// "Continuar con Google" real. El frontend usa el botón oficial de Google
// Identity Services, que le entrega un JWT ya firmado por Google (el
// "credential") — aquí se verifica DE VERDAD con la librería oficial
// (google-auth-library, valida firma + audiencia + expiración, nunca se
// confía en el contenido del token sin verificar).
//
// Dos modos, según si el caller manda `id_entrenador` en el body:
//
// 1. SIN id_entrenador (trainer-partners, login de entrenador/dueño de
//    negocio): comportamiento original sin cambios.
//      - Si el correo YA es una cuenta real (global, sin scope), inicia
//        sesión de una vez.
//      - Si es nuevo, NO se crea la cuenta aquí — regresa la identidad para
//        que el wizard de registro (RegisterTrainerFlow.vue) la use y salte
//        el paso de contraseña (ese registro sí necesita negocio/plan/pago).
//
// 2. CON id_entrenador (apps de cliente de una tienda específica, ej.
//    Premium Supplements): la búsqueda de cuenta existente queda scoped a
//    esa tienda (`findByEmailAndCompany`) — si el correo ya es cuenta de
//    OTRA tienda/entrenador, NO se mezcla con esa cuenta ajena, se trata
//    como nuevo. Y como estas apps no tienen wizard de negocio, un correo
//    nuevo se registra y loguea de una vez (contraseña aleatoria que el
//    cliente nunca necesita, porque siempre entra por Google) — mismo
//    "ticket de bienvenida" que ya recibe cualquier registro normal.
const { OAuth2Client } = require('google-auth-library');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const keys = require('../config/keys.js');
const User = require('../models/user.js');
const Rol = require('../models/rol.js');

const client = new OAuth2Client(keys.googleClientId);

function buildSessionData(myUser, token) {
    return {
        id: myUser.id,
        name: myUser.name,
        lastname: myUser.lastname,
        email: myUser.email,
        phone: myUser.phone,
        image: myUser.image,
        session_token: `JWT ${token}`,
        autenticated: myUser.autenticated,
        is_trainer: myUser.is_trainer,
        document: myUser.document,
        id_entrenador: myUser.id_entrenador,
        roles: myUser.roles,
        gym: myUser.gym,
        state: myUser.state,
        credential: myUser.credential,
        keystore: myUser.keystore,
        balance: myUser.balance,
        mi_store: myUser.mi_store,
        company: myUser.company
    };
}

async function signInExistingUser(myUser) {
    const token = jwt.sign(
        { id: myUser.id, email: myUser.email, id_entrenador: myUser.id_entrenador },
        keys.secretOrKey
    );
    await User.updateToken(myUser.id, `JWT ${token}`);
    return { isNewUser: false, ...buildSessionData(myUser, token) };
}

module.exports = {

    async verify(req, res) {
        try {
            if (!keys.googleClientId) {
                return res.status(503).json({ success: false, message: 'Continuar con Google todavía no está configurado en el servidor.' });
            }
            const { credential, id_entrenador } = req.body;
            if (!credential) {
                return res.status(400).json({ success: false, message: 'Falta el token de Google.' });
            }

            let payload;
            try {
                const ticket = await client.verifyIdToken({ idToken: credential, audience: keys.googleClientId });
                payload = ticket.getPayload();
            } catch (verifyError) {
                return res.status(401).json({ success: false, message: 'El token de Google no es válido.' });
            }

            if (!payload.email_verified) {
                return res.status(401).json({ success: false, message: 'Tu correo de Google no está verificado.' });
            }

            // ---------- Modo 2: app de cliente de una tienda (scoped) ----------
            if (id_entrenador) {
                const myUser = await User.findByEmailAndCompany(payload.email, id_entrenador);

                if (myUser) {
                    const data = await signInExistingUser(myUser);
                    return res.status(200).json({ success: true, data });
                }

                // No tiene cuenta en ESTA tienda. Antes de crear una, hay que
                // checar si ese correo ya existe en OTRA tienda/entrenador —
                // `email` es UNIQUE en toda la tabla `users` (no solo por
                // tienda), así que un INSERT con el mismo correo tronaría con
                // un error de base de datos crudo si no se valida esto antes.
                const existingElsewhere = await User.findByEmail(payload.email);
                if (existingElsewhere) {
                    return res.status(409).json({
                        success: false,
                        message: 'Ese correo de Google ya tiene una cuenta en otro negocio. Regístrate con tu teléfono o usa otra cuenta de Google.'
                    });
                }

                // Correo realmente nuevo — se registra de una vez, sin pedir
                // contraseña: Google ya verificó identidad.
                const randomPassword = crypto.randomBytes(24).toString('hex');
                const created = await User.create({
                    email: payload.email,
                    name: payload.given_name || payload.name || '',
                    lastname: payload.family_name || '',
                    phone: null,
                    image: payload.picture || null,
                    password: randomPassword,
                    id_entrenador
                });
                await Rol.create(created.id, 1); // CLIENTE
                await User.createticket(created.id); // mismo ticket de bienvenida que registerWithOutImage

                const freshUser = await User.findByEmailAndCompany(payload.email, id_entrenador);
                const data = await signInExistingUser(freshUser);
                return res.status(201).json({ success: true, data });
            }

            // ---------- Modo 1: login de entrenador/dueño (sin cambios) ----------
            const myUser = await User.findByEmail(payload.email);

            if (!myUser) {
                return res.status(200).json({
                    success: true,
                    data: {
                        isNewUser: true,
                        email: payload.email,
                        name: payload.given_name || payload.name || '',
                        lastname: payload.family_name || '',
                        picture: payload.picture || null
                    }
                });
            }

            const data = await signInExistingUser(myUser);
            return res.status(200).json({ success: true, data });
        } catch (error) {
            console.log(`Error en googleAuthController.verify: ${error}`);
            return res.status(501).json({ success: false, message: 'Error al verificar con Google', error: error.message });
        }
    }

};
