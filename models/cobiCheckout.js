// models/cobiCheckout.js
//
// NUEVO — Diseño de la pasarela de pago COBI (panel del entrenador, Vue).
// Se guarda como un solo JSON por entrenador (`id_trainer` = users.id del
// entrenador logueado, el mismo id que ya usa useTrainerIdentity.js del
// front para armar sus enlaces) en vez de columnas separadas, porque el
// editor le sigue agregando campos nuevos seguido — así no hace falta
// tocar el esquema cada vez que el front agrega una opción de diseño.
const db = require('../config/config.js');

const CobiCheckout = {};

CobiCheckout.getByTrainer = (id_trainer) => {
    return db.oneOrNone(`SELECT design FROM cobi_checkout_designs WHERE id_trainer = $1`, [id_trainer]);
};

CobiCheckout.upsert = async (id_trainer, design) => {
    const existing = await db.oneOrNone(`SELECT id FROM cobi_checkout_designs WHERE id_trainer = $1`, [id_trainer]);
    if (existing) {
        await db.none(`UPDATE cobi_checkout_designs SET design = $2, updated_at = NOW() WHERE id_trainer = $1`, [id_trainer, design]);
        return { id: existing.id };
    }
    const row = await db.one(`INSERT INTO cobi_checkout_designs (id_trainer, design) VALUES ($1, $2) RETURNING id`, [id_trainer, design]);
    return { id: row.id };
};

// NUEVO — datos reales (nombre + logo) del entrenador dueño del enlace
// público, para armar un diseño por defecto dinámico cuando todavía no
// guardó ninguno (ver getPublicDesign en el controller). Antes, sin un
// diseño guardado a mano, CUALQUIER entrenador con planes reales veía
// "página no configurada" en su propio enlace — esto lo resuelve sin
// depender de que alguien abra el editor primero.
CobiCheckout.getTrainerBranding = (id_trainer) => {
    const sql = `
        SELECT u.name, u.lastname, c.name AS company_name, c.logo AS company_logo
        FROM users u
        LEFT JOIN company c ON c.id = u.mi_store
        WHERE u.id = $1
    `;
    return db.oneOrNone(sql, [id_trainer]);
};

module.exports = CobiCheckout;
