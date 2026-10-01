// models/workoutSessionLog.js
//
// NUEVO — registro real de cómo le fue al cliente al terminar una sesión
// de entrenamiento (duración final, dificultad percibida, ánimo con el
// que terminó y comentarios libres) — pedido explícito para que el
// entrenador lleve un control real, no solo el push de "X terminó su
// sesión" que ya existía (ver player_controller.dart finishWorkout, que
// sigue intacto). Tabla propia `workout_session_logs`.
const db = require('../config/config.js');

const WorkoutSessionLog = {};

WorkoutSessionLog.ensureTable = async () => {
    await db.none(`
        CREATE TABLE IF NOT EXISTS workout_session_logs (
            id SERIAL PRIMARY KEY,
            id_client INTEGER NOT NULL,
            id_company INTEGER,
            routine_name TEXT,
            duration_seconds INTEGER,
            total_reps INTEGER,
            total_volume NUMERIC,
            exercises_count INTEGER,
            difficulty VARCHAR(30),
            mood VARCHAR(30),
            comments TEXT,
            created_at TIMESTAMP NOT NULL DEFAULT NOW()
        )
    `);
    await db.none(`
        CREATE INDEX IF NOT EXISTS idx_workout_session_logs_company
        ON workout_session_logs (id_company, created_at DESC)
    `);
    await db.none(`
        CREATE INDEX IF NOT EXISTS idx_workout_session_logs_client
        ON workout_session_logs (id_client, created_at DESC)
    `);
};

WorkoutSessionLog.create = ({ id_client, id_company, routine_name, duration_seconds, total_reps, total_volume, exercises_count, difficulty, mood, comments }) => {
    return db.one(`
        INSERT INTO workout_session_logs
            (id_client, id_company, routine_name, duration_seconds, total_reps, total_volume, exercises_count, difficulty, mood, comments)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING id, created_at
    `, [id_client, id_company, routine_name, duration_seconds, total_reps, total_volume, exercises_count, difficulty, mood, comments]);
};

// Últimos N registros de TODA la company (lo que ve el entrenador en el
// popup general del panel) — con nombre del cliente ya resuelto.
WorkoutSessionLog.findRecentByCompany = (id_company, limit = 10) => {
    return db.manyOrNone(`
        SELECT l.id, l.id_client, u.name AS client_name, l.routine_name, l.duration_seconds,
               l.total_reps, l.total_volume, l.exercises_count, l.difficulty, l.mood, l.comments, l.created_at
        FROM workout_session_logs l
        LEFT JOIN users u ON u.id = l.id_client
        WHERE l.id_company = $1
        ORDER BY l.created_at DESC
        LIMIT $2
    `, [id_company, limit]);
};

module.exports = WorkoutSessionLog;
