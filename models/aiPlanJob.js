// models/aiPlanJob.js
//
// NUEVO — trabajos en segundo plano para la generación de planes con IA
// (ver controllers/flexAssistantController.js -> generateTrainingPlan).
// Un plan con sobrecarga progresiva real (varias semanas distintas) puede
// tardar más de 30s en generarse con Claude, y Heroku mata cualquier
// respuesta HTTP que tarde más que eso (H12/503) — así que en vez de
// esperar la respuesta completa dentro del mismo request, se crea un job
// aquí, se dispara la generación en segundo plano, y el frontend hace
// polling a /api/flex/generate-training-plan/:jobId hasta que quede listo.
const db = require('../config/config.js');

const AiPlanJob = {};

AiPlanJob.create = async (id_company) => {
    const row = await db.one(
        `INSERT INTO ai_plan_jobs (id_company, status) VALUES ($1, 'pending') RETURNING id`,
        [id_company]
    );
    return row.id;
};

AiPlanJob.findById = (id, id_company) => {
    return db.oneOrNone(
        `SELECT id, status, result, error_message FROM ai_plan_jobs WHERE id = $1 AND id_company = $2`,
        [id, id_company]
    );
};

AiPlanJob.markDone = (id, result) => {
    return db.none(
        `UPDATE ai_plan_jobs SET status = 'done', result = $2, updated_at = NOW() WHERE id = $1`,
        [id, result]
    );
};

AiPlanJob.markError = (id, errorMessage) => {
    return db.none(
        `UPDATE ai_plan_jobs SET status = 'error', error_message = $2, updated_at = NOW() WHERE id = $1`,
        [id, errorMessage]
    );
};

module.exports = AiPlanJob;
