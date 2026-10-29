// models/casaformaUserPackage.js
const db = require('../config/config');

const CasaformaUserPackage = {};

CasaformaUserPackage.getActiveByUser = (userId) => {
    const sql = `
        SELECT
            up.id,
            p.name AS package_name,
            p.type_id,
            COALESCE(p.is_domiciliado, false) AS is_domiciliado,
            up.remaining_classes,
            up.activation_date,
            up.expiration_date,
            true AS is_active
        FROM casaforma.casaforma_user_packages up
        LEFT JOIN casaforma.casaforma_packages p ON up.package_id = p.id
        WHERE up.user_id = $1
          AND up.status = 'active'
          AND (up.expiration_date IS NULL OR up.expiration_date >= CURRENT_DATE)
        ORDER BY up.expiration_date ASC NULLS LAST
    `;
    return db.manyOrNone(sql, [userId]);
};

module.exports = CasaformaUserPackage;
