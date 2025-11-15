const db = require('../config/config.js');

const Gym = {};

// --- FUNCIONES DE ACCESO (Paso G1 - Ya existen) ---

Gym.findActiveMembership = (id_client, id_company) => {
    const sql = `
        SELECT id, plan_name, start_date, end_date
        FROM gym_memberships
        WHERE id_client = $1 AND id_company = $2
        AND status = 'active' AND end_date > NOW()
        ORDER BY end_date DESC LIMIT 1
    `;
    return db.oneOrNone(sql, [id_client, id_company]);
};

Gym.logAccess = (id_company, id_user, access_granted, denial_reason) => {
    const sql = `
        INSERT INTO gym_access_logs(id_company, id_user, access_granted, denial_reason, scanned_at)
        VALUES($1, $2, $3, $4, $5)
    `;
    return db.none(sql, [id_company, id_user, access_granted, denial_reason, new Date()]);
};

// **CAMBIO: Añadida la columna 'id_shift' ($10)**
Gym.createMembership = (membership) => {
    const sql = `
        INSERT INTO gym_memberships(
            id_client, id_company, plan_name, price, start_date, 
            end_date, status, payment_method, payment_id, created_at, updated_at,
            id_shift 
        )
        VALUES($1, $2, $3, $4, $5, $6, 'active', $7, $8, $9, $9, $10)
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
        new Date(),
        membership.id_shift // **NUEVO DATO**
    ]);
};

// **NUEVA FUNCIÓN: (Para la lógica de extensión del webhook)**
// Desactiva una membresía vieja (la marca como 'extended')
Gym.deactivateMembership = (id_membership, new_status = 'extended') => {
    const sql = `
        UPDATE gym_memberships
        SET status = $1, updated_at = $2
        WHERE id = $3
    `;
    return db.none(sql, [new_status, new Date(), id_membership]);
};

// **NUEVA FUNCIÓN: (Para la lógica de extensión del webhook)**
// Busca un plan por su ID
Gym.findById = (id_plan) => {
    const sql = `
        SELECT * FROM gym_membership_plans WHERE id = $1
    `;
    return db.oneOrNone(sql, [id_plan]);
};


// --- **NUEVAS FUNCIONES: CRUD DE PLANES DE MEMBRESÍA (Paso G4.1)** ---

/**
 * (Admin Gym) Crea un nuevo plan (producto) de membresía
 */
Gym.createPlan = (plan) => {
    const sql = `
        INSERT INTO gym_membership_plans(
            id_company,
            name,
            price,
            duration_days,
            is_active,
            created_at,
            updated_at,
            stripe_product_id, -- <-- ¡AÑADIDO!
            stripe_price_id -- <-- ¡AÑADIDO!
        )
        VALUES($1, $2, $3, $4, $5, $6, $6, $7, $8) RETURNING id -- <-- ¡CAMBIADO A $8!
    `;
    return db.one(sql, [
        plan.id_company, // $1
        plan.name, // $2
        plan.price, // $3
        plan.duration_days, // $4
        plan.is_active ?? true, // $5
        new Date(), // $6
        plan.stripe_product_id, // $7
        plan.stripe_price_id // $8
    ]);
};

/**
 * (Admin Gym) Actualiza un plan de membresía
 */
Gym.updatePlan = (plan) => {
    const sql = `
        UPDATE gym_membership_plans
        SET
            name = $1,
            price = $2,
            duration_days = $3,
            is_active = $4,
            updated_at = $5,
            stripe_product_id = $6, -- <-- ¡AÑADIDO!
            stripe_price_id = $7 -- <-- ¡AÑADIDO!
        WHERE
            id = $8 AND id_company = $9
    `;
    return db.none(sql, [
        plan.name, // $1
        plan.price, // $2
        plan.duration_days, // $3
        plan.is_active ?? true, // $4
        new Date(), // $5
        plan.stripe_product_id, // $6
        plan.stripe_price_id, // $7
        plan.id, // $8
        plan.id_company // $9
    ]);
};

/**
 * (Admin Gym) Elimina un plan de membresía
 */
Gym.deletePlan = (id_plan, id_company) => {
    const sql = `
        DELETE FROM gym_membership_plans
        WHERE id = $1 AND id_company = $2
    `;
    return db.none(sql, [id_plan, id_company]);
};

/**
 * (Kiosco/POS) Obtiene todos los planes activos de un gimnasio
 */
Gym.findPlansByCompany = (id_company) => {
    const sql = `
        SELECT id, name, price, duration_days, stripe_price_id -- <-- ¡AÑADIDO!
        FROM gym_membership_plans
        WHERE id_company = $1 AND is_active = true
        ORDER BY price ASC
    `;
    return db.manyOrNone(sql, id_company);
};

/**
 * Encuentra los detalles de un PLAN por su NOMBRE y compañía
 * (Necesario porque 'gym_memberships' solo guarda plan_name)
 */
Gym.findPlanByName = (plan_name, id_company) => {
    const sql = `
        SELECT id, price, duration_days
        FROM gym_membership_plans
        WHERE name = $1 AND id_company = $2
        LIMIT 1
    `;
    return db.oneOrNone(sql, [plan_name, id_company]);
};

/**
 * Encuentra una membresía específica por su ID (usado por el Webhook)
 * (Busca en la tabla 'gym_memberships')
 */
Gym.findMembershipById = (id_membership) => {
    const sql = `
        SELECT *
        FROM gym_memberships
        WHERE id = $1
    `;
    return db.oneOrNone(sql, [id_membership]);
};

Gym.findActiveByClientId = (id_client) => {
    const sql = `
        SELECT 
            id, 
            id_company, 
            plan_name, 
            end_date, 
            status
        FROM 
            gym_memberships
        WHERE 
            id_client = $1
        AND 
            status = 'active'
        ORDER BY 
            end_date DESC 
        LIMIT 1
    `;
    return db.oneOrNone(sql, [id_client]);
};

/**
 * Actualiza la fecha de vencimiento de una membresía (usado por el Webhook)
 * (Actualiza la tabla 'gym_memberships')
 */
Gym.updateEndDate = (id_membership, new_end_date) => {
    const sql = `
        UPDATE gym_memberships
        SET 
            end_date = $1,
            status = 'active', -- Asegurarnos de que esté activa
            updated_at = NOW()
        WHERE
            id = $2
    `;
    return db.none(sql, [new_end_date, id_membership]);
};
// **CAMBIO: Nueva función (basada en la anterior) que busca por ID de cliente**
Gym.findActiveByClientId = (id_client) => {
    const sql = `
        SELECT *
        FROM gym_memberships
        WHERE id_client = $1
        AND status = 'active' AND end_date > NOW()
        ORDER BY end_date DESC LIMIT 1
    `;
    return db.oneOrNone(sql, [id_client]);
};

// *** ¡NUEVA FUNCIÓN PARA EL HISTORIAL DEL CLIENTE! ***
/**
 * Busca todo el historial de membresías de un cliente
 */
Gym.findMembershipHistory = (id_client) => {
    const sql = `
        SELECT 
            id, 
            plan_name, 
            price, 
            start_date, 
            end_date, 
            status, 
            payment_method, 
            payment_id
        FROM gym_memberships
        WHERE id_client = $1
        ORDER BY start_date DESC -- Mostrar las más nuevas primero
    `;
    return db.manyOrNone(sql, [id_client]);
};

Gym.findMembershipHistoryByShift = (id_shift) => {
    const sql = `
        SELECT 
            m.id,
            m.plan_name,
            m.price,
            m.start_date,
            m.end_date,
            m.payment_method,
            m.created_at,
            u.name AS client_name,
            u.lastname AS client_lastname
        FROM 
            gym_memberships AS m
        LEFT JOIN 
            users AS u ON m.id_client = u.id
        WHERE 
            m.id_shift = $1
        ORDER BY 
            m.created_at DESC
    `;
    return db.manyOrNone(sql, id_shift);
};

// ... (tu código existente: createMembership, findById, etc.) ...

/**
 * (Kiosco) Busca un Pase de Día (token crudo) que esté activo
 * y no haya sido usado.
 */
Gym.findActiveDayPass = (token, id_company) => {
    const sql = `
        SELECT id, duration_hours, expires_at
        FROM gym_day_passes
        WHERE token = $1 
          AND id_company = $2
          AND status = 'active'
          AND expires_at > NOW()
    `;
    return db.oneOrNone(sql, [token, id_company]);
};

/**
 * (Kiosco) Marca un Pase de Día como 'usado' después de escanearlo.
 */
Gym.useDayPass = (token) => {
    const sql = `
        UPDATE gym_day_passes
        SET status = 'used', scanned_at = $1
        WHERE token = $2
    `;
    return db.none(sql, [new Date(), token]);
};

Gym.findMembershipsByDateRange = (id_company, startDate, endDate) => {
    const sql = `
        SELECT 
            m.id,
            m.id_client,
            m.plan_name,
            m.price,
            m.start_date,
            m.end_date,
            m.payment_method,
            m.created_at,
            m.id_shift,
            u.name AS client_name,
            u.lastname AS client_lastname
        FROM 
            gym_memberships AS m
        LEFT JOIN 
            users AS u ON m.id_client = u.id
        WHERE 
            m.id_company = $1 
            AND m.created_at BETWEEN $2 AND $3
        ORDER BY 
            m.created_at DESC
    `;
    return db.manyOrNone(sql, [id_company, startDate, endDate]);
};

module.exports = Gym;
