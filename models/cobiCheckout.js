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

module.exports = CobiCheckout;
