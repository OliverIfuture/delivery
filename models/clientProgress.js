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
ClientProgress.getPhotosApp = (id_client) => {
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

ClientProgress.getPhotos = (id_client) => {
    const sql = `
SELECT * FROM (
    -- 1. FOTOS DEL CUESTIONARIO INICIAL
    SELECT
        uq.id,
        uq.questionnaire_data,
        uq.photo_frontal,
        uq.photo_espalda,
        uq.photo_lateral_izq,
        uq.photo_lateral_der,
        uq.created_at AS date_taken,
        'questionnaire' AS source -- Para que sepas de qué tabla viene
    FROM
        user_questionnaires uq
    INNER JOIN
        users u ON u.email = uq.user_email
    WHERE
        u.id = $1

    UNION ALL

    -- 2. FOTOS LOGEADAS POSTERIORMENTE (Agrupadas por día)
    SELECT
        MIN(cpp.id) AS id,
        NULL::jsonb AS questionnaire_data, -- NULL porque esta tabla no tiene cuestionario
        MAX(CASE WHEN cpp.angle ILIKE '%frontal%' THEN cpp.image_url END) AS photo_frontal,
        MAX(CASE WHEN cpp.angle ILIKE '%espalda%' THEN cpp.image_url END) AS photo_espalda,
        MAX(CASE WHEN cpp.angle ILIKE '%izq%' THEN cpp.image_url END) AS photo_lateral_izq,
        MAX(CASE WHEN cpp.angle ILIKE '%der%' THEN cpp.image_url END) AS photo_lateral_der,
        MAX(cpp.created_at)::timestamp without time zone AS date_taken,
        'progress_log' AS source
    FROM
        client_progress_photos cpp
    WHERE
        cpp.id_client = 219
    GROUP BY
        cpp.date_taken -- Agrupamos por día para juntar las 4 fotos en un solo renglón
) AS combined_photos
ORDER BY
    date_taken DESC;
    `;
    return db.manyOrNone(sql, id_client);
};

/**
 * Obtiene la fecha de la foto más reciente, buscando tanto en las actualizaciones
 * como en el cuestionario inicial.
 */
ClientProgress.getLastPhotoDate = (id_client) => {
    // Usamos COALESCE para que si el MAX es NULL, devuelva la fecha antigua
    const sql = `
        SELECT COALESCE(MAX(date_taken), '1999-01-01 00:00:00'::timestamp) as last_photo_date
        FROM (
            -- 1. Fechas de las fotos subidas desde la app
            SELECT date_taken 
            FROM client_progress_photos 
            WHERE id_client = $1
            
            UNION ALL
            
            -- 2. Fechas de los cuestionarios iniciales
            SELECT uq.created_at as date_taken
            FROM user_questionnaires uq
            INNER JOIN users u ON u.email = uq.user_email
            WHERE u.id = $1
        ) as combined_dates;
    `;

    return db.oneOrNone(sql, id_client);
};

/**
 * Guarda una nueva foto de progreso desde la app (Incluyendo el Ángulo)
 */
ClientProgress.logPhotoUserApp = (log) => {
    const sql = `
        INSERT INTO client_progress_photos(
            id_client,
            id_company,
            image_url,
            angle,
            date_taken,
            created_at
        )
        VALUES($1, $2, $3, $4, $5, $6) RETURNING id
    `;
    return db.one(sql, [
        log.id_client,
        log.id_company,
        log.image_url,
        log.angle, // 🔥 Insertamos el ángulo aquí 🔥
        log.date_taken || new Date(),
        new Date()
    ]);
};

module.exports = ClientProgress;
