// models/emoonSettings.js
const db = require('../config/config');

const EmoonSettings = {};

// Obtener toda la configuración (Fila 1)
EmoonSettings.getSettings = () => {
    const sql = `SELECT * FROM emoon.emoon_settings WHERE id = 1;`;
    return db.oneOrNone(sql);
};

// Actualizar solo General Info
EmoonSettings.updateGeneral = (data) => {
    const sql = `
        INSERT INTO emoon.emoon_settings (id, general_info) 
        VALUES (1, $1) 
        ON CONFLICT (id) 
        DO UPDATE SET general_info = $1, updated_at = NOW() 
        RETURNING general_info;
    `;
    // Pasamos el objeto directamente; pg-promise lo convierte a JSON
    return db.oneOrNone(sql, [data]);
};

// Actualizar solo Reglas de Reserva
EmoonSettings.updateBooking = (data) => {
    const sql = `
        INSERT INTO emoon.emoon_settings (id, booking_rules) 
        VALUES (1, $1) 
        ON CONFLICT (id) 
        DO UPDATE SET booking_rules = $1, updated_at = NOW() 
        RETURNING booking_rules;
    `;
    return db.oneOrNone(sql, [data]);
};

// Actualizar solo Horarios
EmoonSettings.updateHours = (data) => {
    const sql = `
        INSERT INTO emoon.emoon_settings (id, business_hours) 
        VALUES (1, $1) 
        ON CONFLICT (id) 
        DO UPDATE SET business_hours = $1, updated_at = NOW() 
        RETURNING business_hours;
    `;
    return db.oneOrNone(sql, [JSON.stringify(data)]); // Stringify para arrays complejos en jsonb
};

// Obtener el estado del cobro administrativo mensual
EmoonSettings.getBillingStatus = () => {
    const sql = `
        SELECT id, admin_billing_status, admin_billing_period, admin_billing_last_updated_at, admin_billing_paid_at, admin_billing_dismissed_at
        FROM emoon.emoon_settings
        WHERE id = 1;
    `;
    return db.oneOrNone(sql);
};

// Actualizar el estado del cobro administrativo mensual.
// `period` identifica el ciclo al que pertenece el estado (formato 'YYYY-MM'),
// para poder distinguir un pago/dismiss de este mes de uno de un mes anterior.
EmoonSettings.updateBillingStatus = (status, period) => {
    const sql = `
        INSERT INTO emoon.emoon_settings (
            id,
            admin_billing_status,
            admin_billing_period,
            admin_billing_last_updated_at,
            admin_billing_paid_at,
            admin_billing_dismissed_at
        )
        VALUES (
            1,
            $1,
            $2,
            NOW(),
            CASE WHEN $1 = 'paid' THEN NOW() ELSE NULL END,
            CASE WHEN $1 = 'dismissed' THEN NOW() ELSE NULL END
        )
        ON CONFLICT (id)
        DO UPDATE SET
            admin_billing_status = $1,
            admin_billing_period = $2,
            admin_billing_last_updated_at = NOW(),
            admin_billing_paid_at = CASE WHEN $1 = 'paid' THEN NOW() ELSE emoon.emoon_settings.admin_billing_paid_at END,
            admin_billing_dismissed_at = CASE WHEN $1 = 'dismissed' THEN NOW() ELSE emoon.emoon_settings.admin_billing_dismissed_at END,
            updated_at = NOW()
        RETURNING admin_billing_status, admin_billing_period, admin_billing_last_updated_at, admin_billing_paid_at, admin_billing_dismissed_at;
    `;

    return db.oneOrNone(sql, [status, period]);
};

module.exports = EmoonSettings;