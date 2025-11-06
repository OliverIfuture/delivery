const db = require('../config/config.js');

const ClientProgress = {};

/**
 * Crea un nuevo registro de métricas (peso, etc.)
 */
ClientProgress.logMetric = (log) => {
    const sql = `
        INSERT INTO client_metrics_log(
            id_client,
            id_company,
            date_logged,
            weight_kg,
            body_fat_percent,
            waist_cm,
            notes,
            created_at,
            updated_at
        )
        VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id
    `;
    return db.one(sql, [
        log.id_client,
        log.id_company,
        log.date_logged || new Date(), // Usa la fecha enviada o la actual
        log.weight_kg,
        log.body_fat_percent,
        log.waist_cm,
        log.notes,
        new Date(),
        new Date()
    ]);
};

/**
 * Guarda una nueva foto de progreso
 */
ClientProgress.logPhoto = (log) => {
    const sql = `
        INSERT INTO client_progress_photos(
            id_client,
            id_company,
            image_url,
            date_taken,
            created_at
        )
        VALUES($1, $2, $3, $4, $5) RETURNING id
    `;
    return db.one(sql, [
        log.id_client,
        log.id_company,
        log.image_url,
        log.date_taken || new Date(), // Usa la fecha enviada o la actual
        new Date()
    ]);
};

/**
 * Obtiene todos los registros de métricas de un cliente
 */
ClientProgress.getMetrics = (id_client) => {
    const sql = `
        SELECT
            id,
            date_logged,
            weight_kg,
            body_fat_percent,
            waist_cm,
            notes
        FROM
            client_metrics_log
        WHERE
            id_client = $1
        ORDER BY
            date_logged DESC
    `;
    return db.manyOrNone(sql, id_client);
};

/**
 * Obtiene todas las fotos de progreso de un cliente
 */
ClientProgress.getPhotos = (id_client) => {
    const sql = `
        SELECT
            id,
            image_url,
            date_taken
        FROM
            client_progress_photos
        WHERE
            id_client = $1
        ORDER BY
            date_taken DESC
    `;
    return db.manyOrNone(sql, id_client);
};


module.exports = ClientProgress;
