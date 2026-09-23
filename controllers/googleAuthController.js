// controllers/googleAuthController.js
//
// NUEVO — "Continuar con Google" real. El frontend usa el botón oficial
// de Google Identity Services, que le entrega un JWT ya firmado por
// Google (el "credential") — aquí se verifica DE VERDAD con la librería
// oficial (google-auth-library, valida firma + audiencia + expiración,
// nunca se confía en el contenido del token sin verificar). Con esa
// identidad ya confirmada:
//   - Si el correo YA es una cuenta real, se inicia sesión de una vez
//     (mismo formato de respuesta que usersController.login, para que el
//     frontend no necesite tratarlo distinto).
//   - Si el correo es nuevo, NO se crea la cuenta aquí — Google solo nos
//     da identidad (correo/nombre/foto), no el resto de datos que ya
//     pide el registro real (negocio, color, plan, pago). Se regresa la
//     identidad para que el wizard de registro (RegisterTrainerFlow.vue)
//     la use y salte el paso de contraseña.
const { OAuth2Client } = require('google-auth-library');
const jwt = require('jsonwebtoken');
const keys = require('../config/keys.js');
const User = require('../models/user.js');

const client = new OAuth2Client(keys.googleClientId);

module.exports = {

    async verify(req, res) {
        try {
            if (!keys.googleClientId) {
                return res.status(503).json({ success: false, message: 'Continuar con Google todavía no está configurado en el servidor.' });
            }
            const { credential } = req.body;
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

            const myUser = await User.findByEmail(payload.email);

            if (!myUser) {
                // Correo nuevo — el frontend continúa el registro real
                // (negocio, plan, pago) con este correo ya verificado.
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

            // Correo ya existente — mismo formato de respuesta que
            // usersController.login (sin verificar password: la identidad
            // ya la confirmó Google).
            const token = jwt.sign(
                { id: myUser.id, email: myUser.email, id_entrenador: myUser.id_entrenador },
                keys.secretOrKey
            );
            const data = {
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
            await User.updateToken(myUser.id, `JWT ${token}`);

            return res.status(200).json({ success: true, data: { isNewUser: false, ...data } });
        } catch (error) {
            console.log(`Error en googleAuthController.verify: ${error}`);
            return res.status(501).json({ success: false, message: 'Error al verificar con Google', error: error.message });
        }
    }

};
