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
    // Comentarios por ejercicio ([{ exerciseName, imageUrl, comment }]) — ver
    // database/workout_session_logs_exercise_feedback.sql para la migración.
    await db.none(`
        ALTER TABLE workout_session_logs ADD COLUMN IF NOT EXISTS exercise_feedback JSONB
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

// exerciseFeedback: array ya saneado (ver controller). Se serializa a mano
// porque pg convertiría un array de JS en un array de PostgreSQL.
WorkoutSessionLog.create = ({ id_client, id_company, routine_name, duration_seconds, total_reps, total_volume, exercises_count, difficulty, mood, comments, exerciseFeedback }) => {
    const exercise_feedback = exerciseFeedback && exerciseFeedback.length ? JSON.stringify(exerciseFeedback) : null;
    return db.one(`
        INSERT INTO workout_session_logs
            (id_client, id_company, routine_name, duration_seconds, total_reps, total_volume, exercises_count, difficulty, mood, comments, exercise_feedback)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb)
        RETURNING id, created_at
    `, [id_client, id_company, routine_name, duration_seconds, total_reps, total_volume, exercises_count, difficulty, mood, comments, exercise_feedback]);
};

// Últimos N registros de TODA la company (lo que ve el entrenador en el
// popup general del panel) — con nombre del cliente ya resuelto.
WorkoutSessionLog.findRecentByCompany = (id_company, limit = 10) => {
    return db.manyOrNone(`
        SELECT l.id, l.id_client, u.name AS client_name, l.routine_name, l.duration_seconds,
               l.total_reps, l.total_volume, l.exercises_count, l.difficulty, l.mood, l.comments, l.exercise_feedback, l.created_at
        FROM workout_session_logs l
        LEFT JOIN users u ON u.id = l.id_client
        WHERE l.id_company = $1
        ORDER BY l.created_at DESC
        LIMIT $2
    `, [id_company, limit]);
};

// Historial completo de UN cliente (tarjeta de feedback en su ficha, ver
// ClientDetailView.vue) — a diferencia de findRecentByCompany, que es el
// popup general de toda la company con tope de 50, aquí sí tiene sentido
// un límite más alto porque ya está acotado a un solo cliente.
WorkoutSessionLog.findByClient = (id_client, id_company, limit = 100) => {
    return db.manyOrNone(`
        SELECT l.id, l.id_client, u.name AS client_name, l.routine_name, l.duration_seconds,
               l.total_reps, l.total_volume, l.exercises_count, l.difficulty, l.mood, l.comments, l.exercise_feedback, l.created_at
        FROM workout_session_logs l
        LEFT JOIN users u ON u.id = l.id_client
        WHERE l.id_client = $1 AND l.id_company = $2
        ORDER BY l.created_at DESC
        LIMIT $3
    `, [id_client, id_company, limit]);
};

// Nombre y logo de la empresa del entrenador (para la foto de entrenamiento del cliente).
WorkoutSessionLog.getTrainerBranding = (id_company) => {
    return db.oneOrNone('SELECT name, logo, brand_color FROM company WHERE id = $1', [id_company]);
};

module.exports = WorkoutSessionLog;
