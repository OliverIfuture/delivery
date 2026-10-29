// models/casaformaAttendance.js
const db = require('../config/config');

const CasaformaAttendance = {};

CasaformaAttendance.getClassesByDate = (date) => {
    const target = date || new Date().toISOString().slice(0, 10);
    const sql = `
        SELECT
            sc.id,
            sc.class_type_id,
            ct.name AS class_name,
            cat.name AS category_name,
            ct.description,
            sc.instructor_id,
            u.first_name AS instructor_name,
            u.last_name AS instructor_last_name,
            u.avatar_url AS instructor_image,
            to_char(sc.scheduled_datetime, 'YYYY-MM-DD"T"HH24:MI:SS') AS scheduled_date,
            to_char(sc.scheduled_datetime, 'HH24:MI') AS start_time,
            to_char(sc.scheduled_datetime + (COALESCE(ct.duration_minutes, 45) || ' minutes')::interval, 'HH24:MI') AS end_time,
            COALESCE(sc.override_capacity, ct.max_capacity, 10) AS capacity,
            sc.status,
            COALESCE(
                (SELECT COUNT(*)::int FROM casaforma.casaforma_reservations r WHERE r.scheduled_class_id = sc.id AND r.status != 'cancelled'),
                0
            ) AS booked_spots,
            COALESCE(
                (
                    SELECT json_agg(json_build_object(
                        'id', cu.id,
                        'reservation_id', r.id,
                        'first_name', cu.first_name,
                        'last_name', cu.last_name,
                        'email', cu.email,
                        'phone', cu.phone,
                        'avatar_url', cu.avatar_url,
                        'attended', r.attended,
                        'is_active', cu.is_active,
                        'stats_classes_attended', cu.stats_classes_attended
                    ))
                    FROM casaforma.casaforma_reservations r
                    INNER JOIN casaforma.casaforma_users cu ON cu.id = r.user_id
                    WHERE r.scheduled_class_id = sc.id AND r.status != 'cancelled'
                ),
                '[]'
            ) AS clients
        FROM casaforma.casaforma_scheduled_classes sc
        INNER JOIN casaforma.casaforma_class_types ct ON sc.class_type_id = ct.id
        LEFT JOIN casaforma.casaforma_class_categories cat ON ct.category_id = cat.id
        INNER JOIN casaforma.casaforma_users u ON sc.instructor_id = u.id
        WHERE sc.scheduled_datetime::date = $1::date AND sc.status != 'cancelled'
        ORDER BY sc.scheduled_datetime ASC
    `;
    return db.manyOrNone(sql, [target]);
};

CasaformaAttendance.toggleAttendance = (reservationId, attended) => {
    return db.tx(async (t) => {
        const reservation = await t.oneOrNone(
            `UPDATE casaforma.casaforma_reservations SET attended = $2 WHERE id = $1 RETURNING user_id, attended`,
            [reservationId, attended]
        );
        if (!reservation) return null;

        await t.none(
            `UPDATE casaforma.casaforma_users
             SET stats_classes_attended = GREATEST(COALESCE(stats_classes_attended, 0) + $2, 0)
             WHERE id = $1`,
            [reservation.user_id, attended ? 1 : -1]
        );
        return reservation;
    });
};

module.exports = CasaformaAttendance;
