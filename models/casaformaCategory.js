// models/casaformaCategory.js
const db = require('../config/config');

const CasaformaCategory = {};

CasaformaCategory.getAll = () => {
    const sql = `
        SELECT id, name, color_hex, description
        FROM casaforma.casaforma_class_categories
        ORDER BY name ASC
    `;
    return db.manyOrNone(sql);
};

CasaformaCategory.create = (category) => {
    const sql = `
        INSERT INTO casaforma.casaforma_class_categories(id, name, color_hex, description)
        VALUES($1, $2, $3, $4) RETURNING *
    `;
    return db.oneOrNone(sql, [
        category.id,
        category.name,
        category.color_hex || '#c7a567',
        category.description || null
    ]);
};

CasaformaCategory.delete = (id) => {
    const sql = `DELETE FROM casaforma.casaforma_class_categories WHERE id = $1 RETURNING *`;
    return db.oneOrNone(sql, [id]);
};

module.exports = CasaformaCategory;
