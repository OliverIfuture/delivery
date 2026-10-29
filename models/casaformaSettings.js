// models/casaformaSettings.js — fila única (id = 1), igual que
// emoon_settings. Las actualizaciones hacen MERGE (no reemplazo total)
// sobre el JSONB existente, igual que el spread {...actual, ...data} que
// hacía el mock del frontend.
const db = require('../config/config');

const CasaformaSettings = {};

CasaformaSettings.getSettings = () => {
    const sql = `SELECT general_info, booking_rules, business_hours, admin_billing_status FROM casaforma.casaforma_settings WHERE id = 1`;
    return db.oneOrNone(sql);
};

CasaformaSettings.updateGeneral = async (data) => {
    const current = await db.one(`SELECT general_info FROM casaforma.casaforma_settings WHERE id = 1`);
    const merged = { ...(current.general_info || {}), ...data };
    await db.none(`UPDATE casaforma.casaforma_settings SET general_info = $1, updated_at = NOW() WHERE id = 1`, [merged]);
    return merged;
};

CasaformaSettings.updateBooking = async (data) => {
    const current = await db.one(`SELECT booking_rules FROM casaforma.casaforma_settings WHERE id = 1`);
    const merged = { ...(current.booking_rules || {}), ...data };
    await db.none(`UPDATE casaforma.casaforma_settings SET booking_rules = $1, updated_at = NOW() WHERE id = 1`, [merged]);
    return merged;
};

CasaformaSettings.updateHours = async (data) => {
    await db.none(`UPDATE casaforma.casaforma_settings SET business_hours = $1, updated_at = NOW() WHERE id = 1`, [JSON.stringify(data)]);
    return data;
};

CasaformaSettings.getBillingStatus = () => {
    const sql = `SELECT admin_billing_status, admin_billing_period, admin_billing_last_updated_at, admin_billing_paid_at, admin_billing_dismissed_at FROM casaforma.casaforma_settings WHERE id = 1`;
    return db.oneOrNone(sql);
};

CasaformaSettings.updateBillingStatus = (status, period) => {
    const sql = `
        UPDATE casaforma.casaforma_settings
        SET
            admin_billing_status = $1,
            admin_billing_period = $2,
            admin_billing_last_updated_at = NOW(),
            admin_billing_paid_at = CASE WHEN $1 = 'paid' THEN NOW() ELSE admin_billing_paid_at END,
            admin_billing_dismissed_at = CASE WHEN $1 = 'dismissed' THEN NOW() ELSE admin_billing_dismissed_at END,
            updated_at = NOW()
        WHERE id = 1
        RETURNING admin_billing_status, admin_billing_period, admin_billing_last_updated_at, admin_billing_paid_at, admin_billing_dismissed_at
    `;
    return db.oneOrNone(sql, [status, period || null]);
};

module.exports = CasaformaSettings;
