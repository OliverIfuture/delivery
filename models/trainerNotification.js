// models/trainerNotification.js
//
// NUEVO — notificaciones reales del panel web del entrenador (campana en
// Sidebar.vue, antes 100% hardcodeada en useNotifications.js con datos de
// ejemplo). Tabla propia `trainer_notifications` — OJO: ya existe una
// tabla `notification` (singular) de un dominio viejo no relacionado
// (pedidos/POS, ver Order.getNotifications en models/order.js), por eso
// el nombre en plural y distinto para no chocar.
//
// Solo se guarda `type` (no íconos/colores) — el panel ya mapea type a
// ícono/color localmente (mismo patrón que TYPE_META en
// PlanSummaryModal.vue), así la lógica de estilo vive en un solo lugar.
const db = require('../config/config.js');

const TrainerNotification = {};

TrainerNotification.ensureTable = async () => {
    await db.none(`
        CREATE TABLE IF NOT EXISTS trainer_notifications (
            id SERIAL PRIMARY KEY,
            id_user INTEGER NOT NULL,
            type VARCHAR(40) NOT NULL,
            title TEXT NOT NULL,
            body TEXT,
            link TEXT,
            is_read BOOLEAN NOT NULL DEFAULT FALSE,
            created_at TIMESTAMP NOT NULL DEFAULT NOW()
        )
    `);
    await db.none(`
        CREATE INDEX IF NOT EXISTS idx_trainer_notifications_user
        ON trainer_notifications (id_user, created_at DESC)
    `);
};

// Creación silenciosa a propósito: una notificación es un efecto
// secundario de otra acción real (mensaje/pago/invitación) — si falla,
// no debe tumbar esa acción principal, solo se registra en consola.
TrainerNotification.create = async ({ id_user, type, title, body = null, link = null }) => {
    try {
        if (!id_user || !type || !title) return null;
        return await db.one(`
            INSERT INTO trainer_notifications (id_user, type, title, body, link)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING id
        `, [id_user, type, title, body, link]);
    } catch (error) {
        console.log(`No se pudo crear la notificación (${type}) para el usuario ${id_user}: ${error.message}`);
        return null;
    }
};

TrainerNotification.findByUser = (id_user, limit = 40) => {
    return db.manyOrNone(`
        SELECT id, type, title, body, link, is_read, created_at
        FROM trainer_notifications
        WHERE id_user = $1
        ORDER BY created_at DESC
        LIMIT $2
    `, [id_user, limit]);
};

TrainerNotification.countUnread = async (id_user) => {
    const row = await db.one(`
        SELECT COUNT(*)::int AS n FROM trainer_notifications WHERE id_user = $1 AND is_read = FALSE
    `, [id_user]);
    return row.n;
};

TrainerNotification.markRead = (id, id_user) => {
    return db.none(`UPDATE trainer_notifications SET is_read = TRUE WHERE id = $1 AND id_user = $2`, [id, id_user]);
};

TrainerNotification.markAllRead = (id_user) => {
    return db.none(`UPDATE trainer_notifications SET is_read = TRUE WHERE id_user = $1 AND is_read = FALSE`, [id_user]);
};

// Resuelve el users.id del ENTRENADOR dueño de una company (mi_store) —
// se necesita en los 3 puntos donde se generan notificaciones (chat,
// pagos, invitaciones) porque esos eventos solo conocen el id_company,
// no el id de usuario del entrenador.
TrainerNotification.resolveTrainerUserId = async (id_company) => {
    if (!id_company) return null;
    const row = await db.oneOrNone(`
        SELECT id FROM users WHERE mi_store = $1 AND is_trainer = 'true' LIMIT 1
    `, [String(id_company)]);
    return row ? row.id : null;
};

TrainerNotification.notifyCompany = async (id_company, { type, title, body = null, link = null }) => {
    try {
        const id_user = await TrainerNotification.resolveTrainerUserId(id_company);
        if (!id_user) return null;
        return await TrainerNotification.create({ id_user, type, title, body, link });
    } catch (error) {
        console.log(`No se pudo notificar a la empresa ${id_company} (${type}): ${error.message}`);
        return null;
    }
};

module.exports = TrainerNotification;
