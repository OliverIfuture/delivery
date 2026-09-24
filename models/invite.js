// models/invite.js
//
// NUEVO — enlace real de invitación de cliente para un entrenador. Antes
// el enlace que se compartía/mandaba por correo era 100% falso en el
// frontend (un hash generado en el navegador, sin nada real detrás en el
// backend): no había manera de resolverlo a una compañía real. Aquí se
// arma con un token opaco real guardado en `company.invite_token`
// (columna nueva, se genera perezosamente la primera vez que se pide).
//
// Reutiliza la tabla `invitations` (store_id/email/name/status/client_id)
// que ya usan sendInvitation/checkAndClaimInvitation/createOrUpdateInvitation
// en usersController.js/models/user.js — confirmado con datos reales que
// es la tabla que sí está en uso (44 filas), a diferencia de
// `trainer_invitations` (0 filas, de un flujo paralelo que nunca se usó).
const db = require('../config/config.js');
const crypto = require('crypto');

const Invite = {};

// Token estable por compañía para el enlace genérico ("comparte tu
// enlace"). Se genera una sola vez y se reutiliza siempre después.
Invite.getOrCreateCompanyToken = async (id_company) => {
    const row = await db.oneOrNone('SELECT invite_token FROM company WHERE id = $1', [id_company]);
    if (!row) return null;
    if (row.invite_token) return row.invite_token;

    const token = crypto.randomBytes(8).toString('hex');
    await db.none('UPDATE company SET invite_token = $2 WHERE id = $1', [id_company, token]);
    return token;
};

// Datos públicos (sin necesitar sesión) para personalizar la pantalla de
// "aceptar invitación": marca del entrenador (nombre/compañía/logo/color).
Invite.resolveCompanyByToken = (token) => {
    return db.oneOrNone(`
        SELECT
            c.id AS id_company,
            c.name AS company_name,
            c.logo AS company_logo,
            c.brand_color,
            u.name AS trainer_name,
            u.lastname AS trainer_lastname
        FROM company c
        LEFT JOIN users u ON u.mi_store = c.id AND u.is_trainer = 'true'
        WHERE c.invite_token = $1
        LIMIT 1
    `, [token]);
};

Invite.createPendingEmailInvite = (id_company, email, name) => {
    return db.none(`
        INSERT INTO invitations (store_id, email, name, status, created_at)
        VALUES ($1, $2, $3, 'pending', NOW())
    `, [id_company, email, name || null]);
};

Invite.findPendingByEmailAndCompany = (email, id_company) => {
    return db.oneOrNone(`
        SELECT id FROM invitations WHERE email = $1 AND store_id = $2 AND status = 'pending'
    `, [email, id_company]);
};

module.exports = Invite;
