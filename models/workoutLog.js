const db = require('../config/config.js');

const WorkoutLog = {};

/**
 * Crea un nuevo registro de progreso (un set)
 */
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
    // Definimos el inicio de hoy en UTC. 
    // PostgreSQL puede usar DATE_TRUNC para obtener el inicio del día en la zona horaria del servidor.
    const sql = `
        SELECT 
            id, id_client, id_company, id_routine, exercise_name, set_number, 
            planned_reps, planned_weight, completed_reps, completed_weight, created_at
        FROM 
            workout_logs
        WHERE 
            id_client = $1 AND 
            id_routine = $2 AND 
            -- Filtramos los logs que se hicieron hoy (asumiendo que created_at es TIMESTAMP WITH TIME ZONE)
            created_at >= DATE_TRUNC('day', NOW() AT TIME ZONE 'UTC')
        ORDER BY 
            created_at ASC
    `;
    return db.manyOrNone(sql, [id_client, id_routine]);
};


module.exports = WorkoutLog;
