// models/emoonReservation.js
const db = require('../config/config');

const EmoonReservation = {};

// Crear una reserva (Vía POS o Cliente)
EmoonReservation.create = async (userId, scheduledClassId) => {
    // Validar si el usuario ya tiene reserva activa en esta clase
    const existing = await db.oneOrNone(
        `SELECT id FROM emoon.emoon_reservations 
         WHERE user_id = $1 AND scheduled_class_id = $2 AND status != 'cancelled'`,
        [userId, scheduledClassId]
    );

    if (existing) {
        throw new Error('El cliente ya tiene una reserva activa para esta clase.');
    }

    const sql = `
        INSERT INTO emoon.emoon_reservations(user_id, scheduled_class_id, status)
        VALUES($1, $2, 'active') 
        RETURNING *;
    `;
    return db.oneOrNone(sql, [userId, scheduledClassId]);
};

// Obtener la lista de alumnos inscritos en una clase programada
EmoonReservation.getByClassId = (scheduledClassId) => {
    const sql = `
        SELECT 
            r.id AS reservation_id,
            r.status AS reservation_status,
            r.reserved_at,
            u.id AS user_id,
            u.first_name,
            u.last_name,
            u.email,
            u.phone
        FROM emoon.emoon_reservations r
        INNER JOIN emoon.emoon_users u ON r.user_id = u.id
        WHERE r.scheduled_class_id = $1 AND r.status != 'cancelled'
        ORDER BY r.reserved_at ASC;
    `;
    return db.manyOrNone(sql, [scheduledClassId]);
};

// Cambiar estado de asistencia ('active', 'attended', 'no_show', 'cancelled')
EmoonReservation.updateStatus = (reservationId, status) => {
    const sql = `
        UPDATE emoon.emoon_reservations
        SET status = $1,
            cancelled_at = CASE WHEN $1 = 'cancelled' THEN NOW() ELSE cancelled_at END
        WHERE id = $2
        RETURNING *;
    `;
    return db.oneOrNone(sql, [status, reservationId]);
};

module.exports = EmoonReservation;