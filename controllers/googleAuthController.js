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
const db = require('../config/config.js');
const User = require('../models/user.js');

const client = new OAuth2Client(keys.googleClientId);

// Crea el usuario + su rol CLIENTE + su ticket de bienvenida como UNA sola
// transacción. Antes se hacían como 3 escrituras sueltas (igual que
// usersController.registerWithOutImage) — si la 2a o 3a fallaba, el
// usuario quedaba creado pero SIN rol, invisible para cualquier búsqueda
// futura (que siempre hace INNER JOIN con user_has_roles) pero bloqueando
// ese correo para siempre por el UNIQUE(email). Esto pasó de verdad en
// producción (fila huérfana encontrada y limpiada el 22-oct-2026).
async function createScopedClient({ email, name, lastname, image, password, id_entrenador }) {
    const hashedPassword = crypto.createHash('md5').update(password).digest('hex');
    return db.tx(async (t) => {
        const user = await t.one(
            `INSERT INTO users(email, name, lastname, phone, image, password, created_at, updated_at, id_entrenador)
             VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
            [email, name, lastname, null, image, hashedPassword, new Date(), new Date(), id_entrenador]
        );
        await t.none(
            `INSERT INTO user_has_roles(id_user, id_rol, created_at, updated_at) VALUES($1, 1, $2, $3)`,
            [user.id, new Date(), new Date()]
        );
        await t.none(
            `INSERT INTO tickets(ticket_name, active, amount, user_id) VALUES('BIENVENIDO', 'ACTIVE', 50, $1)`,
            [user.id]
        );
        return user;
    });
}

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
                try {
                    await createScopedClient({
                        email: payload.email,
                        name: payload.given_name || payload.name || '',
                        lastname: payload.family_name || '',
                        image: payload.picture || null,
                        password: randomPassword,
                        id_entrenador
                    });
                } catch (createError) {
                    // Red de seguridad por si dos clics casi simultáneos
                    // pasan ambos el chequeo de arriba (carrera real) — con
                    // la transacción esto ya no deja filas rotas, solo hay
                    // que responder claro en vez de tronar con el error crudo.
                    if (createError.code === '23505') {
                        return res.status(409).json({
                            success: false,
                            message: 'Ese correo ya tiene una cuenta. Intenta iniciar sesión de nuevo.'
                        });
                    }
                    throw createError;
                }

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
