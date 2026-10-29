// models/casaformaReservation.js
const db = require('../config/config');

const CasaformaReservation = {};

const SELECT_JOINED = `
    SELECT
        r.id AS reservation_id,
        r.id,
        r.scheduled_class_id,
        r.user_id,
        r.status,
        r.attended,
        ct.name AS class_name,
        cat.name AS category_name,
        to_char(sc.scheduled_datetime, 'YYYY-MM-DD"T"HH24:MI:SS') AS scheduled_date,
        to_char(sc.scheduled_datetime, 'HH24:MI') AS start_time,
        to_char(sc.scheduled_datetime + (COALESCE(ct.duration_minutes, 45) || ' minutes')::interval, 'HH24:MI') AS end_time,
        u.first_name AS instructor_name,
        u.last_name AS instructor_last_name
    FROM casaforma.casaforma_reservations r
    INNER JOIN casaforma.casaforma_scheduled_classes sc ON r.scheduled_class_id = sc.id
    LEFT JOIN casaforma.casaforma_class_types ct ON sc.class_type_id = ct.id
    LEFT JOIN casaforma.casaforma_class_categories cat ON ct.category_id = cat.id
    LEFT JOIN casaforma.casaforma_users u ON sc.instructor_id = u.id
`;

CasaformaReservation.getById = (id) => {
    const sql = `${SELECT_JOINED} WHERE r.id = $1`;
    return db.oneOrNone(sql, [id]);
};

CasaformaReservation.create = (userId, scheduledClassId) => {
    return db.tx(async (t) => {
        const sc = await t.oneOrNone(
            `SELECT sc.id, COALESCE(sc.override_capacity, ct.max_capacity, 10) AS capacity
             FROM casaforma.casaforma_scheduled_classes sc
             LEFT JOIN casaforma.casaforma_class_types ct ON sc.class_type_id = ct.id
             WHERE sc.id = $1 AND sc.status = 'scheduled'`,
            [scheduledClassId]
        );
        if (!sc) throw new Error('Clase no encontrada.');

        const already = await t.oneOrNone(
            `SELECT id FROM casaforma.casaforma_reservations WHERE scheduled_class_id = $1 AND user_id = $2 AND status != 'cancelled'`,
            [scheduledClassId, userId]
        );
        if (already) throw new Error('Ya tienes una reservación en esta clase.');

        const bookedRes = await t.one(
            `SELECT COUNT(*)::int AS count FROM casaforma.casaforma_reservations WHERE scheduled_class_id = $1 AND status != 'cancelled'`,
            [scheduledClassId]
        );
        if (bookedRes.count >= sc.capacity) throw new Error('Esta clase ya no tiene cupo disponible.');

        const reservation = await t.one(
            `INSERT INTO casaforma.casaforma_reservations(scheduled_class_id, user_id, status, attended, reserved_at)
             VALUES($1, $2, 'confirmed', false, NOW()) RETURNING id`,
            [scheduledClassId, userId]
        );
        return reservation.id;
    }).then((id) => CasaformaReservation.getById(id));
};

CasaformaReservation.getByClass = (classId) => {
    const sql = `${SELECT_JOINED} WHERE r.scheduled_class_id = $1 AND r.status != 'cancelled' ORDER BY r.reserved_at ASC`;
    return db.manyOrNone(sql, [classId]);
};

CasaformaReservation.getByUserId = (userId) => {
    const sql = `${SELECT_JOINED} WHERE r.user_id = $1 AND r.status != 'cancelled' ORDER BY sc.scheduled_datetime DESC`;
    return db.manyOrNone(sql, [userId]);
};

CasaformaReservation.updateStatus = async (reservationId, status) => {
    const row = await db.oneOrNone(
        `UPDATE casaforma.casaforma_reservations
         SET status = $2, cancelled_at = CASE WHEN $2 = 'cancelled' THEN NOW() ELSE cancelled_at END
         WHERE id = $1 RETURNING id`,
        [reservationId, status]
    );
    if (!row) return null;
    return CasaformaReservation.getById(reservationId);
};

CasaformaReservation.cancel = (reservationId) => {
    const sql = `
        UPDATE casaforma.casaforma_reservations
        SET status = 'cancelled', cancelled_at = NOW()
        WHERE id = $1 RETURNING id
    `;
    return db.oneOrNone(sql, [reservationId]);
};

module.exports = CasaformaReservation;
