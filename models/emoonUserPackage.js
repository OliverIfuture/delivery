// models/emoonUserPackage.js
const db = require('../config/config');

const EmoonUserPackage = {};

// Obtener el total acumulado de créditos activos del usuario
EmoonUserPackage.getActivePackage = async (userId) => {
    const sql = `
        SELECT 
            COALESCE(SUM(remaining_classes), 0)::int AS remaining_classes,
            MAX(expiration_date) AS expiration_date,
            COUNT(id)::int AS active_packages_count,
            'Créditos Acumulados' AS package_name
        FROM emoon.emoon_user_packages
        WHERE user_id = $1
          AND status = 'active'
          AND (expiration_date IS NULL OR expiration_date >= CURRENT_DATE)
          AND remaining_classes > 0;
    `;
    const result = await db.oneOrNone(sql, [userId]);

    // Si no tiene clases disponibles
    if (!result || result.remaining_classes === 0) {
        return null;
    }

    return result;
};

EmoonUserPackage.getByUserId = async (userId) => {
    const sql = `
        SELECT 
            up.*,
            COALESCE(p.name, 'Paquete de Clases') AS package_name
        FROM emoon.emoon_user_packages up
        LEFT JOIN emoon.emoon_packages p ON up.package_id = p.id
        WHERE up.user_id = $1
        ORDER BY up.created_at DESC;
    `;
    return db.manyOrNone(sql, [userId]);
};

module.exports = EmoonUserPackage;