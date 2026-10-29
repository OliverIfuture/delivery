// models/casaformaReservation.js
//
// Lógica de créditos portada 1:1 de models/emoonReservation.js (probada
// en producción): reservar descuenta 1 crédito del paquete activo del
// cliente (o nada si es membresía ilimitada); cancelar lo regresa SOLO
// si el cliente cancela el admin SIEMPRE lo regresa (no es su culpa) —
// mismas reglas, mismo helper refundPackageCredit.
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

// Devuelve 1 crédito al paquete exacto. Solo reactiva si estaba agotado
// (no revive un paquete vencido/cancelado) — idéntico a
// emoonReservation.js -> refundPackageCredit.
async function refundPackageCredit(t, userPackageId) {
    const res = await t.result(
        `UPDATE casaforma.casaforma_user_packages
         SET remaining_classes = remaining_classes + 1,
             status = CASE WHEN status = 'depleted' THEN 'active' ELSE status END
         WHERE id = $1 AND remaining_classes IS NOT NULL`,
        [userPackageId]
    );
    return res.rowCount > 0;
}

CasaformaReservation.create = (userId, scheduledClassId) => {
    return db.tx(async (t) => {
        const already = await t.oneOrNone(
            `SELECT id FROM casaforma.casaforma_reservations WHERE scheduled_class_id = $1 AND user_id = $2 AND status != 'cancelled'`,
            [scheduledClassId, userId]
        );
        if (already) throw new Error('Ya tienes una reservación en esta clase.');

        const sc = await t.oneOrNone(
            `SELECT sc.id, COALESCE(sc.override_capacity, ct.max_capacity, 10) AS capacity,
                    (SELECT COUNT(*)::int FROM casaforma.casaforma_reservations r WHERE r.scheduled_class_id = sc.id AND r.status != 'cancelled') AS booked_spots
             FROM casaforma.casaforma_scheduled_classes sc
             LEFT JOIN casaforma.casaforma_class_types ct ON sc.class_type_id = ct.id
             WHERE sc.id = $1 AND sc.status = 'scheduled'`,
            [scheduledClassId]
        );
        if (!sc) throw new Error('La clase seleccionada no está disponible o fue cancelada.');
        if (sc.booked_spots >= sc.capacity) throw new Error('Esta clase ya no tiene cupo disponible.');

        // Buscar paquete o membresía activa — igual que
        // emoonReservation.js: vigente, y con créditos disponibles O
        // membresía ilimitada (remaining_classes NULL).
        const activePackage = await t.oneOrNone(
            `SELECT up.id, up.remaining_classes, up.expiration_date, up.status, p.type_id
             FROM casaforma.casaforma_user_packages up
             LEFT JOIN casaforma.casaforma_packages p ON up.package_id = p.id
             WHERE up.user_id = $1
               AND up.status = 'active'
               AND (up.expiration_date IS NULL OR up.expiration_date >= CURRENT_DATE)
               AND (up.remaining_classes > 0 OR up.remaining_classes IS NULL OR p.type_id = 'membership')
             ORDER BY up.expiration_date ASC NULLS LAST
             LIMIT 1`,
            [userId]
        );
        if (!activePackage) {
            throw new Error('No tienes créditos ni una membresía activa disponible. Compra un paquete para poder reservar.');
        }

        const isMembership = activePackage.type_id === 'membership';
        const chargedCredit = !isMembership && activePackage.remaining_classes !== null;

        const reservation = await t.one(
            `INSERT INTO casaforma.casaforma_reservations(scheduled_class_id, user_id, status, attended, reserved_at, user_package_id, charged_credit)
             VALUES($1, $2, 'confirmed', false, NOW(), $3, $4) RETURNING id`,
            [scheduledClassId, userId, activePackage.id, chargedCredit]
        );

        if (chargedCredit) {
            const newRemaining = activePackage.remaining_classes - 1;
            const newStatus = newRemaining <= 0 ? 'depleted' : 'active';
            await t.none(
                `UPDATE casaforma.casaforma_user_packages SET remaining_classes = $1, status = $2 WHERE id = $3`,
                [newRemaining, newStatus, activePackage.id]
            );
        }

        await t.none(
            `UPDATE casaforma.casaforma_users SET stats_classes_attended = COALESCE(stats_classes_attended, 0) + 1 WHERE id = $1`,
            [userId]
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

// Admin (CalendarWidget.vue -> toggleAttendance): marca asistencia o
// cancela a un alumno a nombre del club. Si cancela el CLUB, el crédito
// se regresa SIEMPRE (sin ventana de horas) — no es justo cobrarle al
// cliente como si hubiera cancelado tarde por su cuenta. Idéntico a
// emoonReservation.js -> updateStatus.
CasaformaReservation.updateStatus = (reservationId, status) => {
    if (status === 'cancelled') {
        return db.tx(async (t) => {
            const reservation = await t.oneOrNone(
                `UPDATE casaforma.casaforma_reservations SET status = 'cancelled', cancelled_at = NOW() WHERE id = $1 RETURNING *`,
                [reservationId]
            );
            if (!reservation) return null;
            if (reservation.charged_credit === true && reservation.user_package_id) {
                await refundPackageCredit(t, reservation.user_package_id);
            }
            return reservation;
        }).then(() => CasaformaReservation.getById(reservationId));
    }

    return db.oneOrNone(
        `UPDATE casaforma.casaforma_reservations
         SET status = $2, cancelled_at = CASE WHEN $2 = 'cancelled' THEN NOW() ELSE cancelled_at END
         WHERE id = $1 RETURNING id`,
        [reservationId, status]
    ).then((row) => (row ? CasaformaReservation.getById(reservationId) : null));
};

// Cliente cancela su propia reservación desde su app — el crédito solo
// se regresa si cancela con suficiente anticipación
// (booking_rules.cancellationWindowHours, default 12h). Verifica que la
// reservación sea del propio cliente (userId). Idéntico a
// emoonReservation.js -> cancelWithCredit.
CasaformaReservation.cancelWithCredit = (reservationId, userId) => {
    return db.tx(async (t) => {
        // diff_hours se calcula EN POSTGRES (EXTRACT EPOCH), no en
        // JS con `new Date(stringSinZonaHoraria)` — esa forma se probó
        // y falla: config/config.js desactiva el parseo de timestamps
        // (types.setTypeParser(1114, ...) devuelve el string crudo), y
        // un string sin zona horaria tipo "2026-10-29 02:57:46" lo
        // interpreta JS como HORA LOCAL del proceso, no UTC — en
        // Heroku puede coincidir por accidente (dynos en UTC), pero en
        // cualquier otro entorno corre el riesgo real de aprobar un
        // reembolso que no debería (confirmado con una prueba real:
        // sin este fix, cancelar 1h antes con ventana de 6h reembolsaba
        // igual). Comparar todo del lado de Postgres lo hace correcto
        // sin importar en qué zona horaria corra el proceso de Node.
        const reservation = await t.oneOrNone(
            `SELECT r.*, EXTRACT(EPOCH FROM (sc.scheduled_datetime - NOW())) / 3600 AS diff_hours
             FROM casaforma.casaforma_reservations r
             INNER JOIN casaforma.casaforma_scheduled_classes sc ON r.scheduled_class_id = sc.id
             WHERE r.id = $1 AND r.user_id = $2 AND r.status != 'cancelled'`,
            [reservationId, userId]
        );
        if (!reservation) throw new Error('Reserva no encontrada o ya cancelada.');

        const settingsRes = await t.oneOrNone(`SELECT booking_rules FROM casaforma.casaforma_settings WHERE id = 1`);
        const cancellationHours = parseInt(settingsRes?.booking_rules?.cancellationWindowHours ?? 12, 10);

        const eligibleForRefund = Number(reservation.diff_hours) >= cancellationHours;

        await t.none(
            `UPDATE casaforma.casaforma_reservations SET status = 'cancelled', cancelled_at = NOW() WHERE id = $1`,
            [reservationId]
        );

        let refunded = false;
        if (eligibleForRefund && reservation.charged_credit === true && reservation.user_package_id) {
            refunded = await refundPackageCredit(t, reservation.user_package_id);
        }

        return { refunded, cancellationHours };
    });
};

// Admin cancela la clase COMPLETA: cancela todas sus reservaciones y
// regresa el crédito de las que sí lo descontaron (sin ventana de
// horas, porque la cancela el club). Idéntico a emoonReservation.js ->
// cancelClassWithRefunds.
CasaformaReservation.cancelClassWithRefunds = (scheduledClassId) => {
    return db.tx(async (t) => {
        const cls = await t.oneOrNone(
            `UPDATE casaforma.casaforma_scheduled_classes SET status = 'cancelled' WHERE id = $1 RETURNING *`,
            [scheduledClassId]
        );
        if (!cls) return null;

        const cancelled = await t.manyOrNone(
            `UPDATE casaforma.casaforma_reservations
             SET status = 'cancelled', cancelled_at = NOW()
             WHERE scheduled_class_id = $1 AND status != 'cancelled'
             RETURNING id, user_package_id, charged_credit`,
            [scheduledClassId]
        );

        let refundedCount = 0;
        for (const r of cancelled) {
            if (r.charged_credit === true && r.user_package_id) {
                if (await refundPackageCredit(t, r.user_package_id)) refundedCount++;
            }
        }
        return { scheduledClass: cls, cancelledReservations: cancelled.length, refundedCount };
    });
};

module.exports = CasaformaReservation;
