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


WorkoutLog.create = (log) => {
    const idClient = log.idClient ?? log.id_client;
    const idCompany = log.idCompany ?? log.id_company ?? null;
    const idRoutine = log.idRoutine ?? log.id_routine;
    const exerciseName = log.exerciseName ?? log.exercise_name ?? "";

    const setNumber = parseInt(log.setNumber ?? log.set_number ?? 1) || 1;
    const plannedReps = parseInt(log.plannedReps ?? log.planned_reps ?? 0) || 0;
    const plannedWeight = parseFloat(log.plannedWeight ?? log.planned_weight ?? 0.0) || 0.0;
    const completedReps = parseInt(log.completedReps ?? log.completed_reps ?? 0) || 0;
    let completedWeight = parseFloat(log.completedWeight ?? log.completed_weight ?? 0.0);
    if (isNaN(completedWeight)) completedWeight = 0.0;
    const notes = log.notes ?? "";
    const createdAt = log.createdAt ?? log.created_at ?? new Date();

    // 🔥 NUESTRAS COORDENADAS
    const dayNameKey = log.day_name_key ?? "";
    const weekNumber = log.week_number ?? 1;

    const sql = `
        WITH inserted_log AS (
            INSERT INTO workout_logs(
                id_client, id_company, id_routine, exercise_name, 
                set_number, planned_reps, planned_weight, 
                completed_reps, completed_weight, notes, created_at, updated_at
            )
            VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
            RETURNING id, id_client, id_routine, exercise_name, completed_weight, completed_reps, set_number
        )
        UPDATE routines
        SET plan_data = CASE 
            WHEN jsonb_typeof(plan_data) = 'null' OR plan_data IS NULL THEN plan_data
            
            -- FORMATO NUEVO MULTI-SEMANA
            WHEN plan_data ? 'weeks' THEN 
                jsonb_set(
                    plan_data,
                    '{weeks}',
                    (
                        SELECT COALESCE(jsonb_agg(
                            -- 🎯 FILTRO 1: ¿Es la semana correcta?
                            CASE WHEN (week_obj->>'week_number')::int = $14::int THEN
                                jsonb_set(
                                    week_obj,
                                    '{days}',
                                    (
                                        SELECT COALESCE(jsonb_object_agg(day_key, 
                                            -- 🎯 FILTRO 2: ¿Es el día correcto (Ej: 'Lunes')?
                                            CASE WHEN day_key = $13::text THEN
                                                jsonb_set(
                                                    day_val,
                                                    '{blocks}',
                                                    (
                                                        SELECT COALESCE(jsonb_agg(
                                                            jsonb_set(
                                                                block_obj,
                                                                '{exercises}',
                                                                (
                                                                    SELECT COALESCE(jsonb_agg(
                                                                        CASE 
                                                                            WHEN LOWER(TRIM(ex_obj->>'name')) = LOWER(TRIM((SELECT exercise_name FROM inserted_log)))
                                                                            THEN 
                                                                                CASE 
                                                                                    WHEN jsonb_typeof(ex_obj->'sets') = 'array' 
                                                                                         AND jsonb_array_length(ex_obj->'sets') >= (SELECT set_number FROM inserted_log) 
                                                                                    THEN
                                                                                        jsonb_set(
                                                                                            ex_obj,
                                                                                            '{sets}',
                                                                                            (
                                                                                                SELECT COALESCE(jsonb_agg(
                                                                                                    -- 🎯 FILTRO 3: ¿Es el Set correcto?
                                                                                                    CASE WHEN (idx - 1) = ((SELECT set_number FROM inserted_log) - 1)
                                                                                                         THEN 
                                                                                                            set_item || jsonb_build_object(
                                                                                                                'weight', COALESCE((SELECT completed_weight FROM inserted_log), 0)::text,
                                                                                                                'reps', COALESCE((SELECT completed_reps FROM inserted_log), 0)::text
                                                                                                            )
                                                                                                         ELSE 
                                                                                                            set_item
                                                                                                    END
                                                                                                ), '[]'::jsonb)
                                                                                                FROM jsonb_array_elements(ex_obj->'sets') WITH ORDINALITY AS arr(set_item, idx)
                                                                                            )
                                                                                        )
                                                                                    ELSE
                                                                                        ex_obj || jsonb_build_object('weight', COALESCE((SELECT completed_weight FROM inserted_log), 0)::text, 'reps', COALESCE((SELECT completed_reps FROM inserted_log), 0)::text)
                                                                                END
                                                                            ELSE ex_obj
                                                                        END
                                                                    ), '[]'::jsonb)
                                                                    FROM jsonb_array_elements(CASE WHEN jsonb_typeof(block_obj->'exercises') = 'array' THEN block_obj->'exercises' ELSE '[]'::jsonb END) AS ex_obj
                                                                )
                                                            )
                                                        ), '[]'::jsonb)
                                                        FROM jsonb_array_elements(CASE WHEN jsonb_typeof(day_val->'blocks') = 'array' THEN day_val->'blocks' ELSE '[]'::jsonb END) AS block_obj
                                                    )
                                                )
                                            -- Si no es el día que envió Flutter, lo dejamos intacto
                                            ELSE day_val END
                                        ), '{}'::jsonb)
                                        FROM jsonb_each(CASE WHEN jsonb_typeof(week_obj->'days') = 'object' THEN week_obj->'days' ELSE '{}'::jsonb END) AS days(day_key, day_val)
                                    )
                                )
                            -- Si no es la semana que envió Flutter, la dejamos intacta
                            ELSE week_obj END
                        ), '[]'::jsonb)
                        FROM jsonb_array_elements(CASE WHEN jsonb_typeof(plan_data->'weeks') = 'array' THEN plan_data->'weeks' ELSE '[]'::jsonb END) AS week_obj
                    )
                )
            ELSE plan_data
        END
        WHERE id = $3 AND id_client = $1
        RETURNING (SELECT id FROM inserted_log) AS id;
    `;

    return db.one(sql, [
        idClient, idCompany, idRoutine, exerciseName, setNumber, plannedReps,
        plannedWeight, completedReps, completedWeight, notes, createdAt, createdAt,
        dayNameKey, weekNumber // <-- $13 y $14
    ]);
};
WorkoutLog.create3 = (log) => {
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
