// controllers/clientAdherenceController.js
//
// NUEVO — resumen real de entrenamiento por cliente para la lista de
// Clientes del entrenador (antes "weeklyGoalDays"/"plan activo"/"última
// actividad" eran valores hardcodeados en el frontend, sin relación con
// nada real — ver normalizeClientListItem en clientsController.js).
//   - "scheduledDays"/"trainedDays": ver getMyClientsWeeklyAdherence
//     original (sin cambios de criterio).
//   - "routineName"/"currentWeek"/"totalWeeks": de la MISMA rutina
//     activa — para la columna "Plan activo" (nombre + "Semana X de Y").
//   - "lastActivity": el set más reciente de TODA la historia del
//     cliente (no solo esta semana) — para "Última actividad".
const Routine = require('../models/routine.js');
const WorkoutLog = require('../models/workoutLog.js');

function scheduledDaysForRoutine(routine) {
    const weeks = routine?.plan_data?.weeks;
    if (!Array.isArray(weeks) || !weeks.length) return 0;
    const week = weeks.find((w) => Number(w.week_number) === Number(routine.current_week)) || weeks[0];
    const days = week?.days;
    if (!days || typeof days !== 'object') return 0;
    return Object.values(days).filter((day) => {
        const blocks = Array.isArray(day?.blocks) ? day.blocks : [];
        return blocks.some((b) => Array.isArray(b?.exercises) && b.exercises.length > 0);
    }).length;
}

module.exports = {
    async getMyClientsWeeklyAdherence(req, res) {
        try {
            const id_company = req.user.mi_store;
            if (!id_company) {
                return res.status(403).json({ success: false, message: 'Tu cuenta no tiene una empresa asignada.' });
            }

            const [routines, trainedRows, lastActivityRows] = await Promise.all([
                Routine.findActiveByTrainer(id_company),
                WorkoutLog.getWeeklyTrainedDaysByCompany(id_company),
                WorkoutLog.getLastActivityByCompany(id_company)
            ]);

            const trainedByClient = new Map(trainedRows.map((r) => [String(r.id_client), r.days_trained]));
            const lastActivityByClient = new Map(lastActivityRows.map((r) => [String(r.id_client), r.last_activity]));

            const data = routines
                .filter((r) => r.id_client)
                .map((r) => {
                    const totalWeeks = Array.isArray(r.plan_data?.weeks) ? r.plan_data.weeks.length : 0;
                    return {
                        id_client: r.id_client,
                        scheduled_days: scheduledDaysForRoutine(r),
                        trained_days: trainedByClient.get(String(r.id_client)) || 0,
                        routine_name: r.name || null,
                        current_week: r.current_week || 1,
                        total_weeks: totalWeeks,
                        last_activity: lastActivityByClient.get(String(r.id_client)) || null
                    };
                });

            return res.status(200).json({ success: true, data });
        } catch (error) {
            console.log(`Error en clientAdherenceController.getMyClientsWeeklyAdherence: ${error}`);
            return res.status(501).json({ success: false, message: 'Error al calcular la adherencia semanal' });
        }
    }
};
