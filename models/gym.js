const db = require('../config/config.js');

const Gym = {};

/**
 * Busca la membresía ACTIVA MÁS RECIENTE de un cliente en un gimnasio específico.
 * La clave es 'end_date > NOW()' para asegurar que no esté vencida.
 */
Gym.findActiveMembership = (id_client, id_company) => {
    const sql = `
        SELECT 
            id, 
            plan_name, 
            start_date, 
            end_date
        FROM 
            gym_memberships
        WHERE 
            id_client = $1 
            AND id_company = $2
            AND status = 'active'
            AND end_date > NOW() -- ¡La membresía debe ser válida hoy!
        ORDER BY 
            end_date DESC
        LIMIT 1
    `;
    return db.oneOrNone(sql, [id_client, id_company]);
};

/**
 * Registra un intento de acceso (exitoso o fallido) en el log.
 */
Gym.logAccess = (id_company, id_user, access_granted, denial_reason) => {
    const sql = `
        INSERT INTO gym_access_logs(
            id_company,
            id_user,
            access_granted,
            denial_reason,
            scanned_at
        )
        VALUES($1, $2, $3, $4, $5)
    `;
    return db.none(sql, [id_company, id_user, access_granted, denial_reason, new Date()]);
};

/**
 * Crea una nueva membresía (cuando pagan).
 * Usado por el POS del Gimnasio.
 */
Gym.createMembership = (membership) => {
    const sql = `
        INSERT INTO gym_memberships(
            id_client,
            id_company,
            plan_name,
            price,
            start_date,
            end_date,
            status,
            payment_method,
            payment_id,
            created_at,
            updated_at
        )
        VALUES($1, $2, $3, $4, $5, $6, 'active', $7, $8, $9, $9)
        RETURNING id
    `;
    return db.one(sql, [
        membership.id_client,
        membership.id_company,
        membership.plan_name,
        membership.price,
        new Date(), // start_date (hoy)
        membership.end_date, // La fecha de fin (calculada en el controller)
        membership.payment_method,
        membership.payment_id,
        new Date()
    ]);
};

module.exports = Gym;
