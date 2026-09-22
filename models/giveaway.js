// models/giveaway.js
//
// NUEVO — hasta ahora `giveaways` solo tenía lectura real (User.
// getActiveGiveaway / getPastGiveaways en models/user.js, usadas por la
// app real) pero NINGUNA función para crear/editar/cerrar un sorteo — las
// 3 filas que existen se cargaron a mano directo en la BD. Esto agrega el
// CRUD real para que el entrenador pueda publicar uno desde el panel Vue.
//
// `id_entrenador` en `giveaways` es la misma "comunidad" que ya usan
// posts/leaderboard (id_entrenador de un cliente == mi_store de su
// entrenador, verificado con datos reales) — como quien PUBLICA el
// sorteo siempre es el entrenador desde este panel, aquí se usa
// directamente req.user.mi_store (ver controllers/giveawayController.js).
const db = require('../config/config.js');

const Giveaway = {};

Giveaway.create = (id_entrenador, data) => {
    const sql = `
        INSERT INTO giveaways (id_entrenador, title, description, prize, media_url, min_level, end_date, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7, 'activo')
        RETURNING *
    `;
    return db.one(sql, [
        id_entrenador,
        data.title,
        data.description || null,
        data.prize || null,
        data.media_url || null,
        data.min_level || 1,
        data.end_date
    ]);
};

Giveaway.getAllByTrainer = (id_entrenador) => {
    const sql = `
        SELECT * FROM giveaways
        WHERE id_entrenador = $1
        ORDER BY created_at DESC
    `;
    return db.manyOrNone(sql, [id_entrenador]);
};

Giveaway.update = (id, id_entrenador, data) => {
    const sql = `
        UPDATE giveaways
        SET title = COALESCE($3, title),
            description = COALESCE($4, description),
            prize = COALESCE($5, prize),
            media_url = COALESCE($6, media_url),
            min_level = COALESCE($7, min_level),
            end_date = COALESCE($8, end_date)
        WHERE id = $1 AND id_entrenador = $2
        RETURNING *
    `;
    return db.oneOrNone(sql, [
        id, id_entrenador,
        data.title !== undefined ? data.title : null,
        data.description !== undefined ? data.description : null,
        data.prize !== undefined ? data.prize : null,
        data.media_url !== undefined ? data.media_url : null,
        data.min_level !== undefined ? data.min_level : null,
        data.end_date !== undefined ? data.end_date : null
    ]);
};

Giveaway.finish = (id, id_entrenador, winner_name) => {
    const sql = `
        UPDATE giveaways
        SET status = 'finalizado', winner_name = $3
        WHERE id = $1 AND id_entrenador = $2
        RETURNING *
    `;
    return db.oneOrNone(sql, [id, id_entrenador, winner_name || null]);
};

Giveaway.remove = (id, id_entrenador) => {
    return db.result(`DELETE FROM giveaways WHERE id = $1 AND id_entrenador = $2`, [id, id_entrenador]);
};

module.exports = Giveaway;
