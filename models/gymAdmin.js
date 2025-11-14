const db = require('../config/config.js');

const GymAdmin = {};

/**
 * **CONSULTA DE ESTADÍSTICAS (CORREGIDA)**
 * Se han reestructurado los JOINs para pre-agregar los totales y
 * evitar la duplicación de sumas (el error "fan-out").
 */
GymAdmin.getStats = (id_company) => {
    const sql = `
    SELECT
        -- 1. Ventas de Hoy (del subquery pre-agregado)
        COALESCE(sales_today.total, 0) AS sales_today,
        
        -- 2. Ventas del Mes (del subquery pre-agregado)
        COALESCE(sales_month.total, 0) AS sales_month,
        
        -- 3. Check-ins de Hoy
        (SELECT COUNT(*) FROM gym_access_logs 
         WHERE id_company = $1 AND access_granted = true AND scanned_at >= NOW()::date) AS check_ins_today,
         
        -- 4. Miembros Activos (Total)
        (SELECT COUNT(*) FROM gym_memberships 
         WHERE id_company = $1 AND status = 'active' AND end_date > NOW()) AS active_members

    FROM 
        company c
    
    -- Subconsulta para Ventas de Hoy (AHORA PRE-AGREGADA)
    LEFT JOIN (
        -- Paso 2: Sumar todos los totales de hoy
        SELECT id_company, SUM(total) AS total
        FROM (
            -- Paso 1: Obtener todas las ventas de hoy
            SELECT id_company, price AS total FROM gym_memberships WHERE id_company = $1 AND created_at >= NOW()::date
            UNION ALL
            SELECT id_company, total FROM pos_sales WHERE id_company = $1 AND created_at >= NOW()::date
        ) AS all_sales_today
        GROUP BY id_company
    ) AS sales_today ON c.id = sales_today.id_company

    -- Subconsulta para Ventas del Mes (AHORA PRE-AGREGADA)
    LEFT JOIN (
        -- Paso 2: Sumar todos los totales del mes
        SELECT id_company, SUM(total) AS total
        FROM (
            -- Paso 1: Obtener todas las ventas del mes
            SELECT id_company, price AS total FROM gym_memberships WHERE id_company = $1 AND created_at >= date_trunc('month', NOW())
            UNION ALL
            SELECT id_company, total FROM pos_sales WHERE id_company = $1 AND created_at >= date_trunc('month', NOW())
        ) AS all_sales_month
        GROUP BY id_company
    ) AS sales_month ON c.id = sales_month.id_company

    WHERE 
        c.id = $1
    GROUP BY
        c.id, sales_today.total, sales_month.total
    `;
    
    return db.oneOrNone(sql, [id_company]);
};


/**
 * Obtiene el historial de accesos de hoy (para la lista).
 * (Esta función estaba correcta y no se modifica)
 */
GymAdmin.getTodayAccessLogs = (id_company) => {
    const sql = `
        SELECT
            log.id,
            log.id_company,
            log.id_user,
            log.access_granted,
            log.denial_reason,
            log.scanned_at,
            u.name AS client_name,
            u.lastname AS client_lastname
        FROM 
            gym_access_logs AS log
        LEFT JOIN
            users AS u ON log.id_user = u.id
        WHERE
            log.id_company = $1
            AND log.scanned_at >= NOW()::date
        ORDER BY
            log.scanned_at DESC
        LIMIT 50 -- Limitar a los últimos 50 accesos del día
    `;
    
    return db.manyOrNone(sql, [id_company]);
};


module.exports = GymAdmin;
