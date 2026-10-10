// controllers/auditController.js
//
// NUEVO — "Auditoría": le da a la cuenta de Coach Community
// (coach.community@thetrainer-app.com, el mismo admin que ya puede borrar
// cualquier post en su comunidad — ver COACH_COMMUNITY_ADMIN_EMAIL en
// coachCommunityController.js) la capacidad de entrar al panel COMO
// cualquier entrenador real, para verificar cuentas o ayudarles con una
// tarea. No tiene nada que ver con el super-admin viejo (id fijo '4' en
// authMiddleware.isSuperAdmin) — es un segundo nivel de permisos aparte,
// gateado por correo, no por id.
//
// impersonate() genera un token real exactamente como el login normal
// (misma forma de respuesta que usersController.login) pero sin pedir
// contraseña — por eso listTrainers()/impersonate() SIEMPRE revisan
// primero que quien llama sea de verdad ese correo, nunca confían en nada
// que venga del cliente.
const User = require('../models/user.js');
const db = require('../config/config.js');
const jwt = require('jsonwebtoken');
const keys = require('../config/keys.js');

const AUDIT_ADMIN_EMAIL = 'coach.community@thetrainer-app.com';

function isAuditAdmin(req) {
    return (req.user?.email || '').trim().toLowerCase() === AUDIT_ADMIN_EMAIL;
}

function findUserById(id) {
    return new Promise((resolve, reject) => {
        User.findById(id, (err, user) => (err ? reject(err) : resolve(user)));
    });
}

module.exports = {
    async listTrainers(req, res) {
        if (!isAuditAdmin(req)) {
            return res.status(403).json({ success: false, message: 'No tienes permisos de auditoría.' });
        }
        try {
            const rows = await User.findAllTrainersForAudit();
            return res.status(200).json({ success: true, data: rows });
        } catch (error) {
            console.log(`Error en auditController.listTrainers: ${error}`);
            return res.status(501).json({ success: false, message: 'Error al obtener los entrenadores' });
        }
    },

    async impersonate(req, res) {
        if (!isAuditAdmin(req)) {
            return res.status(403).json({ success: false, message: 'No tienes permisos de auditoría.' });
        }
        try {
            const targetId = req.params.id;
            const target = await findUserById(targetId);
            if (!target) {
                return res.status(404).json({ success: false, message: 'Entrenador no encontrado.' });
            }

            const token = jwt.sign(
                { id: target.id, email: target.email, id_entrenador: target.id_entrenador },
                keys.secretOrKey,
                {}
            );

            let company = null;
            if (target.mi_store) {
                company = await db.oneOrNone('SELECT * FROM company WHERE id = $1', [target.mi_store]);
            }

            const data = {
                id: target.id,
                name: target.name,
                lastname: target.lastname,
                email: target.email,
                phone: target.phone,
                image: target.image,
                session_token: `JWT ${token}`,
                autenticated: target.autenticated,
                is_trainer: target.is_trainer,
                document: target.document,
                id_entrenador: target.id_entrenador,
                roles: [],
                gym: target.gym,
                state: target.state,
                credential: target.credential,
                keystore: target.keystore,
                balance: target.balance,
                mi_store: target.mi_store,
                company
            };

            await User.updateToken(target.id, `JWT ${token}`);

            return res.status(200).json({ success: true, data, message: 'Sesión de auditoría iniciada.' });
        } catch (error) {
            console.log(`Error en auditController.impersonate: ${error}`);
            return res.status(501).json({ success: false, message: 'Error al entrar como este entrenador' });
        }
    }
};
