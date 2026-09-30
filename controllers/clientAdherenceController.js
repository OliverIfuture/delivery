// controllers/clientAdherenceController.js
//
// NUEVO — "adherencia semanal real" para la lista de Clientes del
// entrenador (antes esa columna, cuando existía, usaba weeklyGoalDays
// hardcodeado a 4 en el frontend y nunca se guardaba nada real — ver
// normalizeClientListItem en clientsController.js del frontend). Aquí:
//   - "scheduledDays" (cuántos días le tocan esta semana) sale de la
//     rutina ACTIVA real del cliente — cuenta los días de la semana en
//     curso (plan_data.weeks[current_week].days) que tienen al menos un
//     ejercicio real (un día de descanso trae blocks vacíos).
//   - "trainedDays" (cuántos lleva) sale de workout_logs reales, mismo
//     criterio domingo→sábado que ya usa trainingStats.js del frontend
//     para un solo cliente — aquí es un query agregado para TODA la
//     empresa de un jalón, no uno por cliente.
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

            const [routines, trainedRows] = await Promise.all([
                Routine.findActiveByTrainer(id_company),
                WorkoutLog.getWeeklyTrainedDaysByCompany(id_company)
            ]);

            const trainedByClient = new Map(trainedRows.map((r) => [String(r.id_client), r.days_trained]));

            const data = routines
                .filter((r) => r.id_client)
                .map((r) => ({
                    id_client: r.id_client,
                    scheduled_days: scheduledDaysForRoutine(r),
                    trained_days: trainedByClient.get(String(r.id_client)) || 0
                }));

            return res.status(200).json({ success: true, data });
        } catch (error) {
            console.log(`Error en clientAdherenceController.getMyClientsWeeklyAdherence: ${error}`);
            return res.status(501).json({ success: false, message: 'Error al calcular la adherencia semanal' });
        }
    }
};
