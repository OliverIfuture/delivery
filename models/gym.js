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

Gym.createOrUpdateMembership = async (membership) => {
    
    // 1. BUSCAR SI YA EXISTE UNA FILA PARA ESTE CLIENTE EN ESTE GIMNASIO
    //    (Buscamos la última registrada, activa o inactiva)
    const sqlCheck = `
        SELECT id, end_date 
        FROM gym_memberships 
        WHERE id_client = $1 AND id_company = $2 
        ORDER BY end_date DESC LIMIT 1
    `;
    const existing = await db.oneOrNone(sqlCheck, [
        membership.id_client, 
        membership.id_company
    ]);

    const now = new Date();
    let newStartDate = now; // Por defecto empieza hoy
    let newEndDate = new Date();
    let isUpdate = false;
    let targetId = null;

    // 2. CALCULAR FECHAS INTELIGENTES
    if (existing) {
        // ¡Ya existe una fila! Vamos a reciclarla (UPDATE) para no crear basura
        isUpdate = true;
        targetId = existing.id;
        const currentEndDate = new Date(existing.end_date);

        if (currentEndDate > now) {
            // CASO A: VIGENTE (Extensión)
            // Si vence en el futuro (ej. 20 Ene), sumamos días a ESA fecha.
            // Nueva fecha = 20 Ene + 30 días = 19 Feb.
            // La fecha de inicio NO se toca (sigue siendo la original).
            newStartDate = null; // Indicador para no tocar start_date en SQL
            
            // Clonamos la fecha para no mutar la original por referencia
            let extendedDate = new Date(currentEndDate); 
            extendedDate.setDate(extendedDate.getDate() + membership.duration_days);
            newEndDate = extendedDate;
            
        } else {
            // CASO B: VENCIDA (Renovación)
            // Si venció ayer, la nueva vigencia arranca HOY.
            newStartDate = now;
            
            let renewalDate = new Date(now);
            renewalDate.setDate(renewalDate.getDate() + membership.duration_days);
            newEndDate = renewalDate;
        }
    } else {
        // CASO C: NUEVO CLIENTE (INSERT)
        isUpdate = false;
        let initialDate = new Date(now);
        initialDate.setDate(initialDate.getDate() + membership.duration_days);
        newEndDate = initialDate;
    }

    // 3. EJECUTAR LA CONSULTA CORRECTA
    if (isUpdate) {
        // ACTUALIZAR FILA EXISTENTE
        // Usamos COALESCE para start_date: si newStartDate es null (extensión), deja la que estaba.
        const sqlUpdate = `
            UPDATE gym_memberships
            SET
                plan_name = $1,
                price = $2,
                start_date = COALESCE($3, start_date), 
                end_date = $4,
                status = 'active',
                payment_method = $5,
                payment_id = $6,
                id_shift = $7,
                updated_at = NOW()
            WHERE id = $8
            RETURNING id
        `;
        return db.one(sqlUpdate, [
            membership.plan_name,
            membership.price,
            newStartDate, // Puede ser null si es extensión pura
            newEndDate,
            membership.payment_method,
            membership.payment_id,
            membership.id_shift,
            targetId
        ]);
    } else {
        // CREAR NUEVA FILA (Solo pasa la primera vez)
        const sqlInsert = `
            INSERT INTO gym_memberships(
                id_client, id_company, plan_name, price, 
                start_date, end_date, status, 
                payment_method, payment_id, id_shift, 
                created_at, updated_at
            )
            VALUES($1, $2, $3, $4, $5, $6, 'active', $7, $8, $9, NOW(), NOW())
            RETURNING id
        `;
        return db.one(sqlInsert, [
            membership.id_client,
            membership.id_company,
            membership.plan_name,
            membership.price,
            newStartDate,
            newEndDate,
            membership.payment_method,
            membership.payment_id,
            membership.id_shift
        ]);
    }
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
            stripe_product_id,
            stripe_price_id
        )
        VALUES($1, $2, $3, $4, $5, $6, $6, $7, $8) RETURNING id
    `;
    return db.one(sql, [
        plan.id_company,
        plan.name,
        plan.price,
        plan.duration_days,
        plan.is_active ?? true,
        new Date(),
        plan.stripe_product_id,
        plan.stripe_price_id
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

Gym.findActiveByClientId2 = (id_client, id) => {
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
            id_client = $1 and id = $2
        AND 
            status = 'active'
        ORDER BY 
            end_date DESC 
        LIMIT 1
    `;
    return db.oneOrNone(sql, [id_client, id]);
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
Gym.findActiveByClientId = (id_client, companyId) => {
    const sql = `
        SELECT *
        FROM gym_memberships
        WHERE id_client = $1 and id_company = $2
        AND status = 'active' AND end_date > NOW()
        ORDER BY end_date DESC LIMIT 1
    `;
    return db.oneOrNone(sql, [id_client, companyId]);
};

// *** ¡NUEVA FUNCIÓN PARA EL HISTORIAL DEL CLIENTE! ***
/**
 * Busca todo el historial de membresías de un cliente
 */
Gym.findMembershipHistory = (id_client) => {
    const sql = `
        SELECT 
            id, 
			id_company,
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
