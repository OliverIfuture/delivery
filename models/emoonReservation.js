// models/emoonReservation.js
const db = require('../config/config');

const EmoonReservation = {};

EmoonReservation.create = async (userId, scheduledClassId) => {
    return db.tx(async (t) => {
        // 1. Validar reserva previa activa
        const existing = await t.oneOrNone(
            `SELECT id FROM emoon.emoon_reservations 
             WHERE user_id = $1 AND scheduled_class_id = $2 AND status != 'cancelled'`,
            [userId, scheduledClassId]
        );

        if (existing) {
            throw new Error('El cliente ya tiene una reserva activa para esta clase.');
        }

        // 2. Calcular disponibilidad y conteo de lugares en tiempo real
        const scheduledClass = await t.oneOrNone(
            `SELECT sc.id, 
                    COALESCE(sc.override_capacity, ct.max_capacity, 10) AS capacity,
                    (SELECT COUNT(*)::int FROM emoon.emoon_reservations r WHERE r.scheduled_class_id = sc.id AND r.status != 'cancelled') AS booked_spots
             FROM emoon.emoon_scheduled_classes sc
             LEFT JOIN emoon.emoon_class_types ct ON sc.class_type_id = ct.id
             WHERE sc.id = $1 AND (sc.status = 'scheduled' OR sc.status IS NULL)`,
            [scheduledClassId]
        );

        if (!scheduledClass) {
            throw new Error('La clase seleccionada no está disponible o fue cancelada.');
        }

        if (parseInt(scheduledClass.booked_spots) >= parseInt(scheduledClass.capacity)) {
            throw new Error('La clase está llena. No hay cupos disponibles.');
        }

        // 3. Buscar paquete activo del usuario
        const activePackage = await t.oneOrNone(
            `SELECT id, remaining_classes, class_count
             FROM emoon.emoon_user_packages
             WHERE user_id = $1
               AND status = 'active'
               AND (expiration_date IS NULL OR expiration_date >= CURRENT_DATE)
               AND (remaining_classes > 0 OR class_count IS NULL)
             ORDER BY expiration_date ASC NULLS LAST
             LIMIT 1`,
            [userId]
        );

        if (!activePackage) {
            throw new Error('No tienes créditos activos disponibles. Adquiere un paquete para continuar.');
        }

        // 4. Crear reserva respetando exacto la tabla emoon_reservations
        const reservation = await t.one(
            `INSERT INTO emoon.emoon_reservations(user_id, scheduled_class_id, status)
             VALUES($1, $2, 'active')
             RETURNING *`,
            [userId, scheduledClassId]
        );

        // 5. Descontar 1 crédito al paquete del cliente
        if (activePackage.remaining_classes !== null) {
            const newRemaining = activePackage.remaining_classes - 1;
            const newStatus = newRemaining <= 0 ? 'exhausted' : 'active';
            await t.none(
                `UPDATE emoon.emoon_user_packages
                 SET remaining_classes = $1, status = $2, updated_at = NOW()
                 WHERE id = $3`,
                [newRemaining, newStatus, activePackage.id]
            );
        }

        return reservation;
    });
};

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

EmoonReservation.cancelWithCredit = async (reservationId, userId) => {
    return db.tx(async (t) => {
        const reservation = await t.oneOrNone(
            `SELECT r.*, COALESCE(sc.scheduled_date, sc.scheduled_datetime) AS class_date
             FROM emoon.emoon_reservations r
             INNER JOIN emoon.emoon_scheduled_classes sc ON r.scheduled_class_id = sc.id
             WHERE r.id = $1 AND r.user_id = $2 AND r.status != 'cancelled'`,
            [reservationId, userId]
        );

        if (!reservation) {
            throw new Error('Reserva no encontrada o ya cancelada.');
        }

        const settingsRes = await t.oneOrNone(`SELECT booking_settings FROM emoon.emoon_settings LIMIT 1`);
        let cancellationHours = 12;
        if (settingsRes && settingsRes.booking_settings) {
            const bSettings = typeof settingsRes.booking_settings === 'string'
                ? JSON.parse(settingsRes.booking_settings)
                : settingsRes.booking_settings;
            if (bSettings.cancellationWindowHours) {
                cancellationHours = parseInt(bSettings.cancellationWindowHours);
            }
        }

        const classTime = new Date(reservation.class_date).getTime();
        const diffHours = (classTime - Date.now()) / (1000 * 60 * 60);
        const eligibleForRefund = diffHours >= cancellationHours;

        // Cambiar estado a cancelado
        await t.none(
            `UPDATE emoon.emoon_reservations 
             SET status = 'cancelled', cancelled_at = NOW() 
             WHERE id = $1`,
            [reservationId]
        );

        // Reembolsar crédito si canceló con anticipación
        if (eligibleForRefund) {
            const userPkg = await t.oneOrNone(
                `SELECT id, remaining_classes 
                 FROM emoon.emoon_user_packages 
                 WHERE user_id = $1 
                 ORDER BY updated_at DESC, created_at DESC 
                 LIMIT 1`,
                [userId]
            );

            if (userPkg && userPkg.remaining_classes !== null) {
                await t.none(
                    `UPDATE emoon.emoon_user_packages
                     SET remaining_classes = remaining_classes + 1,
                         status = 'active',
                         updated_at = NOW()
                     WHERE id = $1`,
                    [userPkg.id]
                );
            }
        }

        return { refunded: eligibleForRefund, cancellationHours };
    });
};

module.exports = EmoonReservation;