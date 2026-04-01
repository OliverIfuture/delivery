const db = require('../config/config.js');

const WorkoutLog = {};

/**
 * Crea un nuevo registro de progreso (un set)
 */

WorkoutLog.delete = (id) => {
    const sql = `
        DELETE FROM workout_logs
        WHERE id = $1 
        RETURNING id
    `;
    // Usamos oneOrNone por si acaso el ID ya no existe en la base de datos
    return db.oneOrNone(sql, id);
};


WorkoutLog.create2 = (log) => {
    // Aseguramos que las variables tengan valor sin importar el formato (camelCase o snake_case)
    const idClient = log.id_client || log.idClient;
    const idCompany = log.id_company || log.idCompany;
    const idRoutine = log.id_routine || log.idRoutine;
    const exerciseName = log.exercise_name || log.exerciseName;
    const setNumber = log.set_number || log.setNumber;
    const plannedReps = log.planned_reps || log.plannedReps;
    const plannedWeight = log.planned_weight || log.plannedWeight;
    const completedReps = log.completed_reps || log.completedReps;
    const completedWeight = log.completed_weight || log.completedWeight;
    const notes = log.notes || "";
    const createdAt = log.created_at || log.createdAt || new Date();

    const sql = `
        WITH inserted_log AS (
            -- 1. Insertamos el progreso en el historial
            INSERT INTO workout_logs(
                id_client, id_company, id_routine, exercise_name, 
                set_number, planned_reps, planned_weight, 
                completed_reps, completed_weight, notes, created_at, updated_at
            )
            VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
            RETURNING id_client, id_routine, exercise_name, completed_weight
        )
        -- 2. Actualizamos el peso en la rutina activa del cliente
        UPDATE routines
        SET plan_data = (
            SELECT 
                jsonb_object_agg(day_key, updated_day_val)
            FROM (
                SELECT 
                    day_key,
                    jsonb_set(
                        day_val,
                        '{blocks}',
                        (
                            SELECT jsonb_agg(
                                jsonb_set(
                                    block_obj,
                                    '{exercises}',
                                    (
                                        SELECT jsonb_agg(
                                            CASE 
                                                -- 🎯 Buscamos el ejercicio por nombre (limpiando espacios y mayúsculas)
                                                WHEN LOWER(TRIM(ex_obj->>'name')) = LOWER(TRIM((SELECT exercise_name FROM inserted_log)))
                                                THEN ex_obj || jsonb_build_object('weight', (SELECT completed_weight FROM inserted_log)::text)
                                                ELSE ex_obj
                                            END
                                        )
                                        FROM jsonb_array_elements(block_obj->'exercises') AS ex_obj
                                    )
                                )
                            )
                            FROM jsonb_array_elements(day_val->'blocks') AS block_obj
                        )
                    ) AS updated_day_val
                FROM jsonb_each((SELECT plan_data FROM routines WHERE id = $3 AND id_client = $1)) AS days(day_key, day_val)
            ) AS day_reconstruction
        )
        WHERE id = $3 AND id_client = $1
        RETURNING (SELECT id FROM inserted_log) AS id;
    `;

    return db.one(sql, [
        idClient,        // $1
        idCompany,       // $2
        idRoutine,       // $3
        exerciseName,    // $4
        setNumber,       // $5
        plannedReps,     // $6
        plannedWeight,   // $7
        completedReps,   // $8
        completedWeight, // $9
        notes,           // $10
        createdAt,       // $11
        createdAt        // $12
    ]);
};

WorkoutLog.create = (log) => {
    const sql = `
        INSERT INTO workout_logs(
            id_client,
            id_company,
            id_routine,
            exercise_name,
            set_number,
            planned_reps,
            planned_weight,
            completed_reps,
            completed_weight,
            notes,
            created_at,
            updated_at
        )
        VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING id
    `;
    return db.one(sql, [
        log.id_client,
        log.id_company, // Puede ser NULL ahora
        log.id_routine,
        log.exercise_name,
        log.set_number,
        log.planned_reps,
        log.planned_weight,
        log.completed_reps,
        log.completed_weight,
        log.notes,
        log.created_at, // $11: ¡Esta es la fecha que viene de Flutter!
        log.created_at  // $12: Usamos la misma para updated_at
    ]);
};


/**
 * Obtiene el historial de un cliente para un ejercicio específico
 * Ordenado por fecha, para que el más reciente esté primero
 */
WorkoutLog.getHistoryByExercise = (id_client, exercise_name) => {
    const sql = `
        SELECT
            id,
            set_number,
            completed_reps,
            completed_weight,
            notes,
            created_at
        FROM
            workout_logs
        WHERE
            id_client = $1 AND exercise_name = $2
        ORDER BY
            created_at DESC
        LIMIT 100 -- Limitar a los últimos 100 registros
    `;
    return db.manyOrNone(sql, [id_client, exercise_name]);
};

/**
 * Obtiene todos los logs de una rutina (para ver el resumen)
 */
WorkoutLog.findByRoutine = (id_routine) => {
    const sql = `
        SELECT * FROM workout_logs
        WHERE id_routine = $1
        ORDER BY created_at ASC
    `;
    return db.manyOrNone(sql, id_routine);
};

/**
 * **NUEVA FUNCIÓN: Obtiene todo el historial de un cliente**
 */
WorkoutLog.findByClient = (id_client) => {
    const sql = `
        SELECT * FROM workout_logs
        WHERE id_client = $1
        ORDER BY created_at DESC
    `;
    return db.manyOrNone(sql, id_client);
};


WorkoutLog.getTrainerFeed = (id_company) => {
    const sql = `
SELECT
        w.id,
        w.exercise_name,
        w.set_number,
        w.completed_reps,
        w.completed_weight,
        w.created_at,
        u.id as id_client,
        u.name as client_name,
        COALESCE(u.image, '') as client_image
    FROM
        workout_logs AS w
    INNER JOIN
        users AS u ON w.id_client = u.id
    WHERE
        w.id_company = $1
        -- CORRECCIÓN: Usar zona horaria de Tijuana para definir "Hoy"
        AND (w.created_at AT TIME ZONE 'America/Mexico_City')::date = (NOW() AT TIME ZONE 'America/Tijuana')::date
    ORDER BY
        w.created_at DESC
    `;
    return db.manyOrNone(sql, id_company);
};

WorkoutLog.findByClientAndRoutineToday = (id_client, id_routine) => {
    const sql = `
        SELECT 
            id, id_client, id_company, id_routine, exercise_name, set_number, 
            planned_reps, planned_weight, completed_reps, completed_weight, created_at
        FROM 
            workout_logs
        WHERE 
            id_client = $1 AND 
            id_routine = $2 AND 
            -- CORRECCIÓN DE ZONA HORARIA:
            -- 1. Tomamos NOW() y lo convertimos a hora de México.
            -- 2. Truncamos al inicio del día (00:00 AM de México).
            -- 3. Comparamos si el registro se creó después de esa hora.
            created_at >= DATE_TRUNC('day', NOW() AT TIME ZONE 'America/Mexico_City')
        ORDER BY 
            created_at ASC
    `;
    return db.manyOrNone(sql, [id_client, id_routine]);
};

WorkoutLog.getLogsLast30Days = (id_client, exercise_id) => {
    // IMPORTANTE: Si tu tabla usa 'exercise_name', cambia la condición WHERE.
    // Si tienes 'exercise_id', usa esta.
    // Aquí asumo que quieres filtrar por el ID del ejercicio que viene de la rutina.
    // Si tu tabla workout_logs NO tiene exercise_id, tendrás que buscar por nombre.

    // OPCIÓN A: Si tienes exercise_id en workout_logs

    /* const sql = `
         SELECT * FROM workout_logs
         WHERE id_client = $1 
           AND exercise_id = $2
           AND created_at >= NOW() - INTERVAL '30 days'
         ORDER BY created_at ASC
     `;*/


    // OPCIÓN B (Más probable según tu código anterior): Buscas por NOMBRE
    // Pero el frontend manda ID. Necesitas que el frontend mande el NOMBRE o que la BD tenga el ID.
    // Voy a asumir que en el frontend tienes acceso al nombre y lo enviaremos.

    // Si realmente necesitas por ID y tu tabla solo tiene exercise_name, es un problema de diseño.
    // SOLUCIÓN RÁPIDA: Vamos a filtrar por exercise_id suponiendo que lo agregaste, 
    // o vamos a cambiar el frontend para mandar el nombre.

    // Usemos esta query genérica asumiendo que el parámetro $2 será lo que guardaste en la columna correcta.
    const sql = `
        SELECT 
            id,
            completed_weight, 
            completed_reps, 
            created_at 
        FROM workout_logs
        WHERE id_client = $1 
          AND exercise_name = $2 -- O exercise_id = $2
          AND created_at >= NOW() - INTERVAL '30 days'
        ORDER BY created_at ASC
    `;
    return db.manyOrNone(sql, [id_client, exercise_id]);
};


module.exports = WorkoutLog;
