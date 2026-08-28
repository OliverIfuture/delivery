// models/emoonReservation.js
const db = require('../config/config');

const EmoonReservation = {};

// Crear una reserva con control de créditos y cupo en transacción
EmoonReservation.create = async (userId, scheduledClassId) => {
    return db.tx(async (t) => {
        // 1. Validar si el usuario ya tiene reserva activa en esta clase
        const existing = await t.oneOrNone(
            `SELECT id FROM emoon.emoon_reservations 
             WHERE user_id = $1 AND scheduled_class_id = $2 AND status != 'cancelled'`,
            [userId, scheduledClassId]
        );

        if (existing) {
            throw new Error('El cliente ya tiene una reserva activa para esta clase.');
        }

        // 2. Verificar disponibilidad de cupo
        const scheduledClass = await t.oneOrNone(
            `SELECT sc.id, sc.booked_spots, COALESCE(sc.override_capacity, ct.max_capacity, 10) AS capacity
             FROM emoon.emoon_scheduled_classes sc
             INNER JOIN emoon.emoon_class_types ct ON sc.class_type_id = ct.id
             WHERE sc.id = $1 AND sc.status = 'scheduled'`,
            [scheduledClassId]
        );

        if (!scheduledClass) {
            throw new Error('La clase seleccionada no está disponible o fue cancelada.');
        }

        if (parseInt(scheduledClass.booked_spots) >= parseInt(scheduledClass.capacity)) {
            throw new Error('La clase está llena. No hay cupos disponibles.');
        }

        // 3. Buscar paquete de clases activo más próximo a vencer
        const activePackage = await t.oneOrNone(
            `SELECT id, remaining_classes, class_count
             FROM emoon.emoon_user_packages
             WHERE user_id = $1
               AND status = 'active'
               AND expiration_date >= CURRENT_DATE
               AND (remaining_classes > 0 OR class_count IS NULL)
             ORDER BY expiration_date ASC
             LIMIT 1`,
            [userId]
        );

        if (!activePackage) {
            throw new Error('El cliente no tiene créditos activos disponibles. Debe adquirir un paquete.');
        }

        // 4. Crear reserva vinculando el paquete
        const reservation = await t.one(
            `INSERT INTO emoon.emoon_reservations(user_id, scheduled_class_id, user_package_id, status)
             VALUES($1, $2, $3, 'active')
             RETURNING *`,
            [userId, scheduledClassId, activePackage.id]
        );

        // 5. Incrementar cupos ocupados en la clase
        await t.none(
            `UPDATE emoon.emoon_scheduled_classes SET booked_spots = booked_spots + 1 WHERE id = $1`,
            [scheduledClassId]
        );

        // 6. Descontar 1 crédito al paquete (si no es ilimitado)
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

// Obtener la lista de alumnos inscritos en una clase programada
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

// Cambiar estado de asistencia ('active', 'attended', 'no_show', 'cancelled')
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

// Cancelar reserva y reembolsar crédito si aplica por ventana de tiempo
EmoonReservation.cancelWithCredit = async (reservationId, userId) => {
    return db.tx(async (t) => {
        const reservation = await t.oneOrNone(
            `SELECT r.*, sc.scheduled_datetime
             FROM emoon.emoon_reservations r
             INNER JOIN emoon.emoon_scheduled_classes sc ON r.scheduled_class_id = sc.id
             WHERE r.id = $1 AND r.user_id = $2 AND r.status != 'cancelled'`,
            [reservationId, userId]
        );

        if (!reservation) {
            throw new Error('Reserva no encontrada o ya se encuentra cancelada.');
        }

        // Obtener límite de cancelación en horas desde ajustes (por defecto 12 hrs)
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

        const classTime = new Date(reservation.scheduled_datetime).getTime();
        const diffHours = (classTime - Date.now()) / (1000 * 60 * 60);
        const eligibleForRefund = diffHours >= cancellationHours;

        // Cancelar reserva
        await t.none(
            `UPDATE emoon.emoon_reservations 
             SET status = 'cancelled', cancelled_at = NOW() 
             WHERE id = $1`,
            [reservationId]
        );

        // Reducir cupo de la clase
        await t.none(
            `UPDATE emoon.emoon_scheduled_classes 
             SET booked_spots = GREATEST(0, booked_spots - 1) 
             WHERE id = $1`,
            [reservation.scheduled_class_id]
        );

        // Reembolsar crédito si canceló a tiempo
        if (eligibleForRefund && reservation.user_package_id) {
            await t.none(
                `UPDATE emoon.emoon_user_packages
                 SET remaining_classes = CASE WHEN remaining_classes IS NOT NULL THEN remaining_classes + 1 ELSE remaining_classes END,
                     status = 'active',
                     updated_at = NOW()
                 WHERE id = $1`,
                [reservation.user_package_id]
            );
        }

        return { refunded: eligibleForRefund, cancellationHours };
    });
};

module.exports = EmoonReservation;