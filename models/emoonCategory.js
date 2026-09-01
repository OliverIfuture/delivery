const db = require('../config/config');

const EmoonCategory = {};

EmoonCategory.getAll = () => {
    const sql = `
        SELECT id, name, color_hex, description
        FROM emoon.emoon_class_categories
        ORDER BY name ASC
    `;
    return db.manyOrNone(sql);
};

EmoonCategory.create = (category) => {
    const sql = `
        INSERT INTO emoon.emoon_class_categories(
            id, name, color_hex, description
        ) VALUES($1, $2, $3, $4) RETURNING *
    `;
    return db.oneOrNone(sql, [
        category.id,
        category.name,
        category.color_hex || '#8B5E34',
        category.description
    ]);
};

EmoonCategory.delete = (id) => {
    const sql = `
        DELETE FROM emoon.emoon_class_categories
        WHERE id = $1
        RETURNING *
    `;
    return db.oneOrNone(sql, [id]);
};

module.exports = EmoonCategory;