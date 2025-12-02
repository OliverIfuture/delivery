const db = require('../config/config');

const NutritionLog = {};

NutritionLog.create = (log) => {
    
    // --- 1. CALCULAR HORA MÉXICO (CDMX) ---
    // Obtenemos la fecha actual y la forzamos a la zona horaria de México
    const now = new Date();
    const cdmxDate = new Date(now.toLocaleString('en-US', { timeZone: 'America/Mexico_City' }));

    // Formateamos manualmente a YYYY-MM-DD HH:MM:SS para PostgreSQL
    // (No usamos toISOString porque regresaría a UTC)
    const year = cdmxDate.getFullYear();
    const month = String(cdmxDate.getMonth() + 1).padStart(2, '0');
    const day = String(cdmxDate.getDate()).padStart(2, '0');
    const hours = String(cdmxDate.getHours()).padStart(2, '0');
    const minutes = String(cdmxDate.getMinutes()).padStart(2, '0');
    const seconds = String(cdmxDate.getSeconds()).padStart(2, '0');

    // Esta es la constante que pediste con la hora correcta
    const mexicoTimestamp = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    // --------------------------------------

    const sql = `
        INSERT INTO
            client_nutrition_log(
                id_client,
                id_company,
                product_name,
                barcode,
                calories,
                proteins,
                carbs,
                fats,
                portion_size,
                image_url,
                meal_type,
                created_at,
                updated_at
            )
        VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $12) -- Usamos $12 en lugar de NOW()
        RETURNING id
    `;

    return db.one(sql, [
        log.id_client,
        log.id_company,
        log.product_name,
        log.barcode,
        log.calories,
        log.proteins,
        log.carbs,
        log.fats,
        log.portion_size,
        log.image_url,
        log.meal_type,
        mexicoTimestamp // $12: Pasamos la fecha calculada
    ]);
};

// Obtener el historial de hoy de un cliente
NutritionLog.findByClientToday = (id_client) => {
    const sql = `
        SELECT * FROM client_nutrition_log
        WHERE id_client = $1 
        AND created_at >= DATE_TRUNC('day', NOW() AT TIME ZONE 'UTC')
        ORDER BY created_at DESC
    `;
    return db.manyOrNone(sql, id_client);
};

module.exports = NutritionLog;
