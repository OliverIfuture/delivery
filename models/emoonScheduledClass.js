// models/emoonScheduledClass.js
const db = require('../config/config');

const EmoonScheduledClass = {};

// Crear una nueva clase programada en el calendario
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

// Obtener todas las clases programadas para el calendario
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
                    WHERE r.scheduled_class_id = sc.id AND r.status = 'confirmed'
                ), 0
            ) AS booked_spots,
            sc.status,
            ct.name AS class_name, 
            ct.category_id,
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

module.exports = EmoonScheduledClass;