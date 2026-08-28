// models/emoonUserPackage.js
const db = require('../config/config');

const EmoonUserPackage = {};

// Obtener el paquete activo de un usuario con créditos disponibles y vigente
EmoonUserPackage.getActivePackage = async (userId) => {
    const sql = `
        SELECT *
        FROM emoon.emoon_user_packages
        WHERE user_id = $1
          AND status = 'active'
          AND expiration_date >= CURRENT_DATE
          AND (remaining_classes > 0 OR class_count IS NULL)
        ORDER BY expiration_date ASC
        LIMIT 1;
    `;
    return db.oneOrNone(sql, [userId]);
};

// Obtener todos los paquetes comprados por un usuario
EmoonUserPackage.getByUserId = async (userId) => {
    const sql = `
        SELECT 
            up.*,
            p.name AS package_name
        FROM emoon.emoon_user_packages up
        LEFT JOIN emoon.emoon_packages p ON up.package_id = p.id
        WHERE up.user_id = $1
        ORDER BY up.created_at DESC;
    `;
    return db.manyOrNone(sql, [userId]);
};

module.exports = EmoonUserPackage;