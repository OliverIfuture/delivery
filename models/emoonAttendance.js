const db = require('../config/config');

const EmoonAttendance = {};
const TIMEZONE = "'America/Tijuana'";

EmoonAttendance.getClassesByDate = (date) => {
    // Si envían fecha la usamos, de lo contrario calcula la fecha local de hoy
    const dateCondition = date 
        ? `$1::date` 
        : `(CURRENT_TIMESTAMP AT TIME ZONE ${TIMEZONE})::date`;

    const sql = `
        SELECT 
            sc.id AS scheduled_class_id,
            (sc.scheduled_datetime AT TIME ZONE ${TIMEZONE})::date AS class_date,
            TO_CHAR(sc.scheduled_datetime AT TIME ZONE ${TIMEZONE}, 'HH24:MI') AS start_time,
            TO_CHAR((sc.scheduled_datetime AT TIME ZONE ${TIMEZONE}) + (COALESCE(ct.duration_minutes, 50) || ' minutes')::interval, 'HH24:MI') AS end_time,
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
                ) FILTER (WHERE r.id IS NOT NULL AND r.status != 'cancelled'), '[]'
            ) AS clients
        FROM emoon.emoon_scheduled_classes sc
        JOIN emoon.emoon_class_types ct ON sc.class_type_id = ct.id
        LEFT JOIN emoon.emoon_reservations r ON sc.id = r.scheduled_class_id
        LEFT JOIN emoon.emoon_users u ON r.user_id = u.id
        WHERE (sc.scheduled_datetime AT TIME ZONE ${TIMEZONE})::date = ${dateCondition}
          AND (sc.status = 'scheduled' OR sc.status IS NULL)
        GROUP BY sc.id, sc.scheduled_datetime, ct.name, ct.category_id, ct.duration_minutes
        ORDER BY sc.scheduled_datetime ASC
    `;
    return db.manyOrNone(sql, date ? [date] : []);
};

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