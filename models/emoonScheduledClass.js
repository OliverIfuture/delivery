// models/emoonScheduledClass.js
const db = require('../config/config');

const EmoonScheduledClass = {};

EmoonScheduledClass.create = async (classTypeId, instructorId, scheduledDate) => {
    const sql = `
        INSERT INTO emoon.emoon_scheduled_classes(
            class_type_id, instructor_id, scheduled_datetime, status
        )
        VALUES($1, $2, $3, 'scheduled') 
        RETURNING *;
    `;
    return db.oneOrNone(sql, [classTypeId, instructorId, scheduledDate]);
};

EmoonScheduledClass.getAll = async () => {
    const sql = `
        SELECT 
            sc.id, 
            sc.scheduled_datetime AS scheduled_date, 
            COALESCE(sc.override_capacity, ct.max_capacity, 10) AS capacity,
            COALESCE(
                (
                    SELECT COUNT(*)::int 
                    FROM emoon.emoon_reservations r 
                    WHERE r.scheduled_class_id = sc.id 
                    AND COALESCE(r.status, '') NOT IN ('cancelled', 'cancelada')
                ), 0
            ) AS booked_spots,
            sc.status,
            ct.name AS class_name, 
            ct.category_id,
            ct.category_name,
            u.first_name AS instructor_name, 
            u.last_name AS instructor_last_name
        FROM emoon.emoon_scheduled_classes sc
        INNER JOIN emoon.emoon_class_types ct ON sc.class_type_id = ct.id
        INNER JOIN emoon.emoon_users u ON sc.instructor_id = u.id
        WHERE sc.status = 'scheduled'
        ORDER BY sc.scheduled_datetime ASC;
    `;
    return db.manyOrNone(sql);
};

EmoonScheduledClass.cancel = async (id) => {
    const sql = `
        UPDATE emoon.emoon_scheduled_classes
        SET status = 'cancelled'
        WHERE id = $1
        RETURNING *;
    `;
    return db.oneOrNone(sql, [id]);
};

module.exports = EmoonScheduledClass;