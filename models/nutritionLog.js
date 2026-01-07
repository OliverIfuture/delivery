const db = require('../config/config');

const NutritionLog = {};

NutritionLog.create = (log) => {
    
    // --- 1. CALCULAR HORA MÉXICO (CDMX) ---
    const now = new Date();
    const cdmxDate = new Date(now.toLocaleString('en-US', { timeZone: 'America/Mexico_City' }));

    const year = cdmxDate.getFullYear();
    const month = String(cdmxDate.getMonth() + 1).padStart(2, '0');
    const day = String(cdmxDate.getDate()).padStart(2, '0');
    const hours = String(cdmxDate.getHours()).padStart(2, '0');
    const minutes = String(cdmxDate.getMinutes()).padStart(2, '0');
    const seconds = String(cdmxDate.getSeconds()).padStart(2, '0');

    const mexicoTimestamp = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    // --------------------------------------

    // --- CORRECCIÓN: Validación robusta para id_company ---
    let companyId = log.id_company;
    // Si viene como string "null", "0", número 0, undefined o vacío, forzamos NULL real
    if (!companyId || companyId === 'null' || companyId === 0 || companyId === '0') {
        companyId = null;
    }
    // -----------------------------------------------------

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
        VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $12)
        RETURNING id
    `;

    return db.one(sql, [
        log.id_client,
        companyId, // <--- Usamos la variable saneada que garantiza NULL o un ID válido
        log.product_name,
        log.barcode,
        log.calories,
        log.proteins,
        log.carbs,
        log.fats,
        log.portion_size,
        log.image_url,
        log.meal_type,
        mexicoTimestamp // $12
    ]);
};
// Obtener el historial de hoy de un cliente
NutritionLog.findByClientToday = (id_client) => {
    
    // --- 1. CALCULAR INICIO DEL DÍA EN MÉXICO (CDMX) ---
    const now = new Date();
    // Convertimos la hora actual a la zona de México
    const cdmxDate = new Date(now.toLocaleString('en-US', { timeZone: 'America/Mexico_City' }));

    // Obtenemos año, mes y día de México
    const year = cdmxDate.getFullYear();
    const month = String(cdmxDate.getMonth() + 1).padStart(2, '0');
    const day = String(cdmxDate.getDate()).padStart(2, '0');

    // Creamos el timestamp de las 00:00:00 horas de HOY en México
    const mexicoStartOfDay = `${year}-${month}-${day} 00:00:00`;
    // --------------------------------------

    const sql = `
        SELECT * FROM client_nutrition_log
        WHERE id_client = $1 
        AND created_at >= $2 -- Buscamos registros creados DESPUÉS de las 00:00 de hoy (Hora CDMX)
        ORDER BY created_at DESC
    `;

    return db.manyOrNone(sql, [id_client, mexicoStartOfDay]);
};

NutritionLog.getWeeklyHistory = (id_client) => {
    const sql = `
        SELECT 
            TO_CHAR(created_at, 'YYYY-MM-DD') as date_iso,
            TO_CHAR(created_at, 'DD') as day_number,
            SUM(calories) as calories,
            SUM(proteins) as proteins,
            SUM(carbs) as carbs,
            SUM(fats) as fats
        FROM 
            client_nutrition_log
        WHERE 
            id_client = $1 
            AND created_at >= CURRENT_DATE - INTERVAL '6 days' 
        GROUP BY 
            TO_CHAR(created_at, 'YYYY-MM-DD'),
            TO_CHAR(created_at, 'DD')
        ORDER BY 
            date_iso ASC
    `;

    return db.manyOrNone(sql, [id_client]);
};

module.exports = NutritionLog;
