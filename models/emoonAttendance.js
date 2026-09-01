const db = require('../config/config');

const EmoonAttendance = {};

// Obtener las clases programadas para HOY junto con sus alumnos reservados
EmoonAttendance.getTodayClassesWithUsers = () => {
    const sql = `
        SELECT 
            sc.id AS scheduled_class_id,
            sc.class_date,
            sc.start_time,
            sc.end_time,
            ct.name AS class_name,
            ct.category_id,
            COALESCE(
                json_agg(
                    json_build_object(
                        'reservation_id', r.id,
                        'user_id', u.id,
                        'first_name', u.first_name,
                        'last_name', u.last_name,
                        'email', u.email,
                        'attended', COALESCE(r.attended, false)
                    )
                ) FILTER (WHERE r.id IS NOT NULL), '[]'
            ) AS clients
        FROM emoon.emoon_scheduled_classes sc
        JOIN emoon.emoon_class_types ct ON sc.class_type_id = ct.id
        LEFT JOIN emoon.emoon_reservations r ON sc.id = r.scheduled_class_id
        LEFT JOIN emoon.emoon_users u ON r.user_id = u.id
        WHERE sc.class_date = CURRENT_DATE
        GROUP BY sc.id, ct.name, ct.category_id
        ORDER BY sc.start_time ASC
    `;
    return db.manyOrNone(sql);
};

// Toggle de asistencia para una reservación específica
EmoonAttendance.toggleAttendance = (reservationId, attended) => {
    const sql = `
        UPDATE emoon.emoon_reservations
        SET attended = $2
        WHERE id = $1
        RETURNING *
    `;
    return db.oneOrNone(sql, [reservationId, attended]);
};

module.exports = EmoonAttendance;