const db = require('../config/config.js');

const Routine = {};

Routine.create = (routine) => {
    const sql = `
        INSERT INTO routines(
            id_company,
            id_client,
            name,
            plan_data,
            is_active,
            created_at,
            updated_at
        )
        VALUES($1, $2, $3, $4, $5, $6, $7) RETURNING id
    `;
    return db.one(sql, [
        routine.id_company, // Puede ser null ahora
        routine.id_client,
        routine.name,
        routine.plan_data,
        routine.is_active ?? false,
        new Date(),
        new Date()
    ]);
};

Routine.update = (routine) => {
    const sql = `
        UPDATE routines
        SET
            name = $1,
            plan_data = $2,
            updated_at = $3
        WHERE
            id = $4 
            -- Eliminamos la restricción de id_company aquí para permitir auto-edición
    `;
    return db.none(sql, [
        routine.name,
        routine.plan_data,
        new Date(),
        routine.id
    ]);
};

Routine.delete = (id_routine) => {
    const sql = `
        DELETE FROM routines
        WHERE id = $1
    `;
    return db.none(sql, [id_routine]);
};

Routine.setActive = (id_routine, id_client) => {
    return db.tx(async t => {
        // 1. Desactivar todas las rutinas de este cliente
        await t.none(`
            UPDATE routines
            SET is_active = false, updated_at = $1
            WHERE id_client = $2
        `, [new Date(), id_client]);
        
        // 2. Activar la rutina seleccionada
        await t.none(`
            UPDATE routines
            SET is_active = true, updated_at = $1
            WHERE id = $2 AND id_client = $3
        `, [new Date(), id_routine, id_client]);
    });
};

Routine.findByTrainer = (id_company) => {
    const sql = `
        SELECT
            r.id,
            r.id_company,
            r.id_client,
            r.name,
            r.is_active,
            r.plan_data,
            u.name as client_name,
            COALESCE(u.image, '') as client_image
        FROM
            routines AS r
        INNER JOIN
            users AS u ON r.id_client = u.id
        WHERE
            r.id_company = $1
        ORDER BY
            r.updated_at DESC
    `;
    return db.manyOrNone(sql, id_company);
};

Routine.findActiveByClient = (id_client) => {
    const sql = `
        SELECT
            r.*,
            c.name as trainer_name,
            c.logo as trainer_logo
        FROM
            routines AS r
        LEFT JOIN -- LEFT JOIN porque ahora puede no tener compañía
            company AS c ON r.id_company = c.id
        WHERE
            r.id_client = $1 AND r.is_active = true
    `;
    return db.oneOrNone(sql, id_client); 
};

/**
 * NUEVO: Busca TODAS las rutinas de un cliente (para su biblioteca personal)
 */
Routine.findAllByClient = (id_client) => {
    const sql = `
        SELECT 
            r.*,
            c.name as trainer_name
        FROM 
            routines AS r
        LEFT JOIN
            company AS c ON r.id_company = c.id
        WHERE 
            r.id_client = $1
        ORDER BY 
            r.is_active DESC, r.updated_at DESC
    `;
    return db.manyOrNone(sql, id_client);
};

Routine.findAllByClient = (id_client) => {
    const sql = `
        SELECT 
            r.*,
            c.name as trainer_name,
            c.logo as trainer_logo
        FROM 
            routines AS r
        LEFT JOIN
            company AS c ON r.id_company = c.id
        WHERE 
            r.id_client = $1
        ORDER BY 
            r.is_active DESC, r.updated_at DESC
    `;
    return db.manyOrNone(sql, id_client);
};

/**
 * Obtener la lista de plantillas del sistema (Cards)
 */
Routine.getSystemTemplates = () => {
    const sql = `
        SELECT id, name, description, image_url, duration, difficulty 
        FROM system_routines 
        ORDER BY id ASC
    `;
    return db.manyOrNone(sql);
};

/**
 * CLONAR una plantilla del sistema al usuario
 * Convierte las tablas relacionales al JSON que usa tu app Flutter
 */
Routine.activateTemplate = (id_client, id_system_routine) => {
    return db.tx(async t => {
        // 1. Obtener la información de la Plantilla
        const template = await t.oneOrNone('SELECT * FROM system_routines WHERE id = $1', [id_system_routine]);
        
        if (!template) throw new Error('Plantilla no encontrada');

        // 2. Obtener todos los ejercicios de esa plantilla, unidos con la tabla maestra de ejercicios
        // para obtener la URL de la imagen y descripción
        const rawExercises = await t.manyOrNone(`
            SELECT 
                d.name as day_name, 
                e.sets, e.reps, e.weight, e.notes,
                ex.id as exercise_id, ex.name as exercise_name, ex.description, ex.media_url
            FROM system_routine_days d
            JOIN system_routine_exercises e ON d.id = e.system_routine_day_id
            JOIN exercises ex ON e.exercise_id = ex.id
            WHERE d.system_routine_id = $1
            ORDER BY d.day_number, e.order_index
        `, [id_system_routine]);

        // 3. CONSTRUIR EL JSON (plan_data)
        // Transformamos el array plano de SQL al objeto {"Lunes": [...], "Martes": [...]}
        const planData = {};

        rawExercises.forEach(row => {
            const dayKey = row.day_name; // Ej: "Lunes: Pecho..."

            if (!planData[dayKey]) {
                planData[dayKey] = [];
            }

            planData[dayKey].push({
                "id": row.exercise_id.toString(),
                "name": row.exercise_name,
                "reps": row.reps.toString(),
                "sets": row.sets.toString(),
                "weight": row.weight || "",
                "notes": row.notes || "",
                "mediaUrl": row.media_url,
                "description": row.description
            });
        });

        // 4. Desactivar rutinas anteriores del cliente
        await t.none(`
            UPDATE routines 
            SET is_active = false, updated_at = $1
            WHERE id_client = $2
        `, [new Date(), id_client]);

        // 5. Insertar la nueva rutina clonada
        const newRoutine = await t.one(`
            INSERT INTO routines (
                id_client, 
                id_company, 
                name, 
                plan_data, 
                is_active, 
                created_at, 
                updated_at
            )
            VALUES ($1, NULL, $2, $3, true, $4, $4) -- id_company NULL porque es del sistema
            RETURNING id
        `, [id_client, template.name, planData, new Date()]);

        return newRoutine;
    });
};


module.exports = Routine;
