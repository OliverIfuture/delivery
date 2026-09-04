// models/emoonUserPackage.js
const db = require('../config/config');

const EmoonUserPackage = {};

// Obtener TODOS los paquetes activos y con créditos disponibles del usuario
EmoonUserPackage.getActivePackage = async (userId) => {
    const sql = `
        SELECT 
            up.id,
            up.user_id,
            up.remaining_classes,
            up.expiration_date,
            up.status,
            p.type_id,
            COALESCE(p.name, 'Paquete de Clases') AS package_name
        FROM emoon.emoon_user_packages up
        LEFT JOIN emoon.emoon_packages p ON up.package_id = p.id
        WHERE up.user_id = $1
          AND up.status = 'active'
          AND (up.expiration_date IS NULL OR up.expiration_date >= CURRENT_DATE)
          AND (up.remaining_classes > 0 OR up.remaining_classes IS NULL)
        ORDER BY up.expiration_date ASC NULLS LAST;
    `;
    return db.manyOrNone(sql, [userId]);
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