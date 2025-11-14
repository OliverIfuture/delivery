const db = require('../config/config.js');

const GymAdmin = {};

/**
 * **CONSULTA DE ESTADÍSTICAS (REVERTIDA)**
 * 'check_ins_today' vuelve a contar todos los check-ins del día.
 */
GymAdmin.getStats = (id_company) => {
    const sql = `
    SELECT
        -- 1. Ventas de Hoy
        COALESCE(SUM(sales_today.total), 0) AS sales_today,
        
        -- 2. Ventas del Mes
        COALESCE(SUM(sales_month.total), 0) AS sales_month,
        
        -- 3. **¡CAMBIO!** Check-ins de Hoy (Total de escaneos exitosos)
        (SELECT COUNT(*) FROM gym_access_logs 
         WHERE id_company = $1 AND access_granted = true AND scanned_at >= NOW()::date) AS check_ins_today,
         
        -- 4. Miembros Activos (Total)
        (SELECT COUNT(*) FROM gym_memberships 
         WHERE id_company = $1 AND status = 'active' AND end_date > NOW()) AS active_members

    FROM 
        company c
    
    -- Subconsulta para Ventas de Hoy
    LEFT JOIN (
        SELECT id_company, price AS total FROM gym_memberships WHERE id_company = $1 AND created_at >= NOW()::date
        UNION ALL
        SELECT id_company, total FROM pos_sales WHERE id_company = $1 AND created_at >= NOW()::date
    ) AS sales_today ON c.id = sales_today.id_company

    -- Subconsulta para Ventas del Mes
    LEFT JOIN (
        SELECT id_company, price AS total FROM gym_memberships WHERE id_company = $1 AND created_at >= date_trunc('month', NOW())
        UNION ALL
        SELECT id_company, total FROM pos_sales WHERE id_company = $1 AND created_at >= date_trunc('month', NOW())
    ) AS sales_month ON c.id = sales_month.id_company

    WHERE 
        c.id = $1
    GROUP BY
        c.id
    `;
    
    return db.oneOrNone(sql, [id_company]);
};


/**
 * **CONSULTA DE LISTA (REVERTIDA)**
 * Vuelve a obtener TODOS los logs de hoy, no solo los que están "adentro".
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
