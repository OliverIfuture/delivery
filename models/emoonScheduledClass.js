// models/emoonScheduledClass.js
const db = require('../config/config');

const EmoonScheduledClass = {};

// Crear una nueva clase en el calendario
EmoonScheduledClass.create = async (classTypeId, instructorId, scheduledDate) => {
    // 1. Obtenemos la capacidad por defecto que configuraste en el tipo de clase
    const classType = await db.oneOrNone('SELECT capacity FROM emoon.emoon_class_types WHERE id = $1', [classTypeId]);
    const capacity = classType ? classType.capacity : 10;

    // 2. Insertamos la clase programada
    const sql = `
        INSERT INTO emoon.emoon_scheduled_classes(
            class_type_id, instructor_id, scheduled_date, capacity, booked_spots, status
        )
        VALUES($1, $2, $3, $4, 0, 'active') RETURNING *
    `;

    return db.oneOrNone(sql, [classTypeId, instructorId, scheduledDate, capacity]);
};

// Obtener todas las clases para pintar el calendario
EmoonScheduledClass.getAll = async () => {
    const sql = `
        SELECT 
            sc.id, sc.scheduled_date, sc.capacity, sc.booked_spots, sc.status,
            ct.name AS class_name, ct.color_code,
            u.first_name AS instructor_name, u.last_name AS instructor_last_name
        FROM emoon.emoon_scheduled_classes sc
        INNER JOIN emoon.emoon_class_types ct ON sc.class_type_id = ct.id
        INNER JOIN emoon.emoon_users u ON sc.instructor_id = u.id
        WHERE sc.status = 'active'
        ORDER BY sc.scheduled_date ASC
    `;
    return db.manyOrNone(sql);
};

module.exports = EmoonScheduledClass;