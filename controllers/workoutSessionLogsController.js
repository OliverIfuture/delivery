// controllers/workoutSessionLogsController.js
//
// NUEVO — el cliente registra cómo terminó su sesión (dificultad/ánimo/
// comentarios) al finalizar el entrenamiento en la app, y el entrenador
// los consulta desde el panel (ver models/workoutSessionLog.js). Cada
// registro también genera una notificación real para la campana del
// panel (ver models/trainerNotification.js).
const WorkoutSessionLog = require('../models/workoutSessionLog.js');
const TrainerNotification = require('../models/trainerNotification.js');

const DIFFICULTY_LABELS = {
    very_easy: 'Muy fácil',
    easy: 'Fácil',
    adequate: 'Adecuado',
    hard: 'Difícil',
    very_hard: 'Muy difícil'
};
const MOOD_LABELS = {
    energized: 'Energizado',
    good: 'Bien',
    tired: 'Cansado',
    exhausted: 'Exhausto'
};

module.exports = {
    async create(req, res) {
        try {
            const id_client = req.user.id;
            const id_company = req.user.id_entrenador || null;
            const { routineName, durationSeconds, totalReps, totalVolume, exercisesCount, difficulty, mood, comments } = req.body;

            const row = await WorkoutSessionLog.create({
                id_client,
                id_company,
                routine_name: routineName || null,
                duration_seconds: durationSeconds || null,
                total_reps: totalReps || null,
                total_volume: totalVolume || null,
                exercises_count: exercisesCount || null,
                difficulty: difficulty || null,
                mood: mood || null,
                comments: comments || null
            });

            // --- Notificación real para la campana del panel ---
            try {
                const trainerUserId = await TrainerNotification.resolveTrainerUserId(id_company);
                if (trainerUserId) {
                    const difficultyLabel = DIFFICULTY_LABELS[difficulty] || '';
                    const moodLabel = MOOD_LABELS[mood] || '';
                    const bodyParts = [];
                    if (difficultyLabel) bodyParts.push(`Dificultad: ${difficultyLabel}`);
                    if (moodLabel) bodyParts.push(`Ánimo: ${moodLabel}`);
                    await TrainerNotification.create({
                        id_user: trainerUserId,
                        type: 'achievement',
                        title: `${req.user.name || 'Tu cliente'} terminó su sesión`,
                        body: bodyParts.length ? bodyParts.join(' · ') : (routineName || 'Entrenamiento completado'),
                        link: `/dashboard/clients/${id_client}`
                    });
                }
            } catch (notifErr) {
                console.log(`No se pudo crear la notificación de sesión terminada: ${notifErr.message}`);
            }

            return res.status(201).json({ success: true, data: row });
        } catch (error) {
            console.log(`Error en workoutSessionLogsController.create: ${error}`);
            return res.status(501).json({ success: false, message: 'Error al guardar el registro de la sesión', error: error.message });
        }
    },

    // El entrenador ve los últimos 10 de TODA su company (popup general,
    // ver 4ta imagen del pedido) — req.user.mi_store es su id_company.
    async listRecent(req, res) {
        try {
            const id_company = req.user.mi_store;
            if (!id_company) {
                return res.status(403).json({ success: false, message: 'Tu cuenta no tiene una empresa asignada.' });
            }
            const limit = Math.min(parseInt(req.query.limit) || 10, 50);
            const rows = await WorkoutSessionLog.findRecentByCompany(id_company, limit);
            return res.status(200).json({
                success: true,
                data: rows.map((r) => ({
                    id: r.id,
                    clientId: r.id_client,
                    clientName: r.client_name,
                    routineName: r.routine_name,
                    durationSeconds: r.duration_seconds,
                    totalReps: r.total_reps,
                    totalVolume: r.total_volume ? Number(r.total_volume) : null,
                    exercisesCount: r.exercises_count,
                    difficulty: r.difficulty,
                    difficultyLabel: DIFFICULTY_LABELS[r.difficulty] || null,
                    mood: r.mood,
                    moodLabel: MOOD_LABELS[r.mood] || null,
                    comments: r.comments,
                    createdAt: r.created_at
                }))
            });
        } catch (error) {
            console.log(`Error en workoutSessionLogsController.listRecent: ${error}`);
            return res.status(501).json({ success: false, message: 'Error al obtener los registros de sesiones', error: error.message });
        }
    }
};
