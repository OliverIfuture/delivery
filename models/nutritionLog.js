const db = require('../config/config');

const NutritionLog = {};

NutritionLog.create = (log) => {
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
        VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())
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
        log.meal_type
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
