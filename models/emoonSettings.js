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

module.exports = EmoonSettings;