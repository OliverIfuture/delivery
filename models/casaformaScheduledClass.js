// models/casaformaScheduledClass.js
const db = require('../config/config');

const CasaformaScheduledClass = {};

// Trae cada clase agendada ya con booked_spots y la lista de clientes
// inscritos resuelta (json_agg), igual que el join de Emoon — así el
// frontend (CalendarWidget/CheckinWidget) no tiene que volver a pedir
// nada por separado.
const SELECT_WITH_ATTENDEES = `
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
`;

CasaformaScheduledClass.getAll = () => {
    const sql = `${SELECT_WITH_ATTENDEES} WHERE sc.status != 'cancelled' ORDER BY sc.scheduled_datetime ASC`;
    return db.manyOrNone(sql);
};

CasaformaScheduledClass.getById = (id) => {
    const sql = `${SELECT_WITH_ATTENDEES} WHERE sc.id = $1`;
    return db.oneOrNone(sql, [id]);
};

CasaformaScheduledClass.create = async (data) => {
    const sql = `
        INSERT INTO casaforma.casaforma_scheduled_classes(class_type_id, instructor_id, scheduled_datetime, override_capacity, status)
        VALUES($1, $2, $3::timestamp, $4, 'scheduled')
        RETURNING id
    `;
    const row = await db.one(sql, [data.class_type_id, data.instructor_id, data.scheduled_date, data.capacity || null]);
    return CasaformaScheduledClass.getById(row.id);
};

CasaformaScheduledClass.cancel = async (id) => {
    const sql = `UPDATE casaforma.casaforma_scheduled_classes SET status = 'cancelled' WHERE id = $1 RETURNING id`;
    const row = await db.oneOrNone(sql, [id]);
    if (!row) return null;
    return CasaformaScheduledClass.getById(id);
};

module.exports = CasaformaScheduledClass;
