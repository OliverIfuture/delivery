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
        'questionnaire' AS source 
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
        NULL::jsonb AS questionnaire_data, 
        MAX(CASE WHEN cpp.angle ILIKE '%frontal%' THEN cpp.image_url END) AS photo_frontal,
        MAX(CASE WHEN cpp.angle ILIKE '%espalda%' THEN cpp.image_url END) AS photo_espalda,
        MAX(CASE WHEN cpp.angle ILIKE '%izq%' THEN cpp.image_url END) AS photo_lateral_izq,
        MAX(CASE WHEN cpp.angle ILIKE '%der%' THEN cpp.image_url END) AS photo_lateral_der,
        MAX(cpp.created_at)::timestamp without time zone AS date_taken,
        'progress_log' AS source
    FROM 
        client_progress_photos cpp
    WHERE 
        cpp.id_client = $1 -- ✅ CORREGIDO: Ahora usa la variable dinámica
    GROUP BY 
        cpp.date_taken 
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

// =============================================================================
// NUEVO — CRUD de métricas corporales COMPLETAS, para que el ENTRENADOR
// registre cualquiera de las ~27 métricas del catálogo del panel (no solo
// peso/%grasa/cintura), a nombre de un cliente específico.
//
// `client_metrics_log` sigue siendo la tabla base (una fila = una fecha
// para un cliente, con UNIQUE(id_client, date_logged) — por eso el alta es
// un UPSERT, no un INSERT plano: si el cliente ya tiene un registro ese día
// —por ejemplo porque él mismo ya cargó su peso desde la app—, se
// actualiza en vez de tronar con un choque de llave única).
// `client_metric_values` (id, log_id, metric_key, value, created_at) es la
// tabla hija agregada por migración para las métricas que no tienen
// columna propia — log_id tiene ON DELETE CASCADE, así que borrar el log
// borra sus valores extra solo.
// Las 3 métricas con columna propia (peso/grasa_corporal_pct/
// cintura_minima) se guardan EN AMBOS lados (columna propia + fila espejo
// en client_metric_values) para no romper `logMetric`/`getMetrics`
// (las que usa la app móvil del cliente, ya existentes, no tocadas aquí) y
// mantener el mismo patrón que ya traían los 107 registros migrados.
// =============================================================================

async function replaceMetricValues(t, log_id, values) {
    await t.none(`DELETE FROM client_metric_values WHERE log_id = $1`, [log_id]);
    const entries = Object.entries(values || {}).filter(([, v]) => v != null && v !== '');
    for (const [metric_key, value] of entries) {
        await t.none(`
            INSERT INTO client_metric_values (log_id, metric_key, value, created_at)
            VALUES ($1, $2, $3, NOW())
        `, [log_id, metric_key, value]);
    }
}

// CREATE (o actualiza si ya existe un registro de ese cliente en esa fecha).
ClientProgress.upsertFullMetric = ({ id_client, id_company, date_logged, notes, values = {} }) => {
    return db.tx(async (t) => {
        const log = await t.one(`
            INSERT INTO client_metrics_log(
                id_client, id_company, date_logged,
                weight_kg, body_fat_percent, waist_cm, notes,
                created_at, updated_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
            ON CONFLICT (id_client, date_logged) DO UPDATE SET
                id_company = COALESCE(EXCLUDED.id_company, client_metrics_log.id_company),
                weight_kg = COALESCE(EXCLUDED.weight_kg, client_metrics_log.weight_kg),
                body_fat_percent = COALESCE(EXCLUDED.body_fat_percent, client_metrics_log.body_fat_percent),
                waist_cm = COALESCE(EXCLUDED.waist_cm, client_metrics_log.waist_cm),
                notes = COALESCE(EXCLUDED.notes, client_metrics_log.notes),
                updated_at = NOW()
            RETURNING id
        `, [
            id_client,
            id_company || null,
            date_logged || new Date(),
            values.peso ?? null,
            values.grasa_corporal_pct ?? null,
            values.cintura_minima ?? null,
            notes || null
        ]);

        await replaceMetricValues(t, log.id, values);
        return { id: log.id };
    });
};

// READ — historial completo de un cliente, cada registro con su `values`
// ya fusionado (columnas propias + client_metric_values).
ClientProgress.getFullMetrics = async (id_client) => {
    const logs = await db.manyOrNone(`
        SELECT id, date_logged, weight_kg, body_fat_percent, waist_cm, notes, created_at
        FROM client_metrics_log
        WHERE id_client = $1
        ORDER BY date_logged ASC, id ASC
    `, [id_client]);
    if (!logs.length) return [];

    const logIds = logs.map((l) => l.id);
    const extraValues = await db.manyOrNone(`
        SELECT log_id, metric_key, value
        FROM client_metric_values
        WHERE log_id IN ($1:csv)
    `, [logIds]);

    const valuesByLog = {};
    logs.forEach((l) => {
        valuesByLog[l.id] = {};
        if (l.weight_kg != null) valuesByLog[l.id].peso = l.weight_kg;
        if (l.body_fat_percent != null) valuesByLog[l.id].grasa_corporal_pct = l.body_fat_percent;
        if (l.waist_cm != null) valuesByLog[l.id].cintura_minima = l.waist_cm;
    });
    extraValues.forEach((v) => { valuesByLog[v.log_id][v.metric_key] = v.value; });

    return logs.map((l) => ({
        id: l.id,
        date_logged: l.date_logged,
        notes: l.notes,
        created_at: l.created_at,
        values: valuesByLog[l.id]
    }));
};

// UPDATE — edita un registro existente por su propio id (no por fecha).
ClientProgress.updateFullMetric = (log_id, { date_logged, notes, values = {} }) => {
    return db.tx(async (t) => {
        await t.none(`
            UPDATE client_metrics_log
            SET date_logged = COALESCE($2, date_logged),
                weight_kg = $3,
                body_fat_percent = $4,
                waist_cm = $5,
                notes = $6,
                updated_at = NOW()
            WHERE id = $1
        `, [
            log_id,
            date_logged || null,
            values.peso ?? null,
            values.grasa_corporal_pct ?? null,
            values.cintura_minima ?? null,
            notes || null
        ]);
        await replaceMetricValues(t, log_id, values);
    });
};

// DELETE — borra el registro completo; client_metric_values se borra solo
// por el ON DELETE CASCADE del FK log_id.
ClientProgress.deleteFullMetric = (log_id) => {
    return db.none(`DELETE FROM client_metrics_log WHERE id = $1`, [log_id]);
};

module.exports = ClientProgress;
