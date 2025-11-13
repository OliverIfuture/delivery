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

Gym.createMembership = (membership) => {
    const sql = `
        INSERT INTO gym_memberships(
            id_client, id_company, plan_name, price, start_date, 
            end_date, status, payment_method, payment_id, created_at, updated_at
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
            updated_at
        )
        VALUES($1, $2, $3, $4, $5, $6, $6) RETURNING id
    `;
    return db.one(sql, [
        plan.id_company,
        plan.name,
        plan.price,
        plan.duration_days,
        plan.is_active ?? true,
        new Date()
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
            updated_at = $5
        WHERE
            id = $6 AND id_company = $7
    `;
    return db.none(sql, [
        plan.name,
        plan.price,
        plan.duration_days,
        plan.is_active ?? true,
        new Date(),
        plan.id,
        plan.id_company
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
        SELECT id, name, price, duration_days
        FROM gym_membership_plans
        WHERE id_company = $1 AND is_active = true
        ORDER BY price ASC
    `;
    return db.manyOrNone(sql, id_company);
};

Gym.findById = (id_plan) => {
    const sql = `
        SELECT id, name, price, duration_days, is_active
        FROM gym_membership_plans
        WHERE id = $1
    `;
    // Usamos oneOrNone por si el plan fue eliminado pero la suscripción aún existe
    return db.oneOrNone(sql, [id_plan]); 
};

module.exports = Gym;
