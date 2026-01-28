const db = require('../config/config'); // <--- TU CONEXIÓN A POSTGRES

const EvaluationControl = {};

// Crear nueva evaluación
EvaluationControl.create = (evalData) => {
    const sql = `
        INSERT INTO evaluation_control (user_id, trainer_id, status, created_at, updated_at)
        VALUES ($1, $2, $3, NOW(), NOW())
        RETURNING id
    `;
    return db.oneOrNone(sql, [
        evalData.user_id,
        evalData.trainer_id,
        evalData.status
    ]);
};

// Buscar la última completada (para la regla de 15 días)
EvaluationControl.findLastCompleted = (userId) => {
    const sql = `
        SELECT * FROM evaluation_control 
        WHERE user_id = $1 AND status = 'completed'
        ORDER BY created_at DESC
        LIMIT 1
    `;
    return db.oneOrNone(sql, [userId]);
};

// Actualizar estado y resultado
EvaluationControl.updateStatus = (id, status, result = null) => {
    const sql = `
        UPDATE evaluation_control 
        SET status = $1, result = $2, updated_at = NOW()
        WHERE id = $3
    `;
    return db.none(sql, [status, result, id]);
};

// Buscar por ID (Polling)
EvaluationControl.findById = (id) => {
    const sql = `
        SELECT * FROM evaluation_control WHERE id = $1
    `;
    return db.oneOrNone(sql, [id]);
};

module.exports = EvaluationControl;