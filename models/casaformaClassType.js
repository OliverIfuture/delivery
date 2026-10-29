// models/casaformaClassType.js
const db = require('../config/config');

const CasaformaClassType = {};

CasaformaClassType.getAll = () => {
    const sql = `
        SELECT id, category_id, name, description, duration_minutes, max_capacity, intensity, is_active, created_at
        FROM casaforma.casaforma_class_types
        WHERE is_deleted = false
        ORDER BY created_at DESC
    `;
    return db.manyOrNone(sql);
};

CasaformaClassType.create = (cls) => {
    const sql = `
        INSERT INTO casaforma.casaforma_class_types(
            category_id, name, description, duration_minutes, max_capacity, intensity, is_active, created_at
        ) VALUES($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *
    `;
    return db.oneOrNone(sql, [
        cls.category_id || null,
        cls.name,
        cls.description || null,
        cls.duration_minutes || 45,
        cls.max_capacity || 10,
        cls.intensity || 'Todos los niveles',
        cls.is_active !== false,
        new Date()
    ]);
};

CasaformaClassType.update = (id, cls) => {
    const sql = `
        UPDATE casaforma.casaforma_class_types
        SET
            category_id = COALESCE($2, category_id),
            name = COALESCE($3, name),
            description = COALESCE($4, description),
            duration_minutes = COALESCE($5, duration_minutes),
            max_capacity = COALESCE($6, max_capacity),
            intensity = COALESCE($7, intensity),
            is_active = COALESCE($8, is_active)
        WHERE id = $1 AND is_deleted = false
        RETURNING *
    `;
    return db.oneOrNone(sql, [
        id, cls.category_id, cls.name, cls.description, cls.duration_minutes, cls.max_capacity, cls.intensity, cls.is_active
    ]);
};

CasaformaClassType.delete = (id) => {
    const sql = `
        UPDATE casaforma.casaforma_class_types
        SET is_deleted = true
        WHERE id = $1
        RETURNING id
    `;
    return db.oneOrNone(sql, [id]);
};

module.exports = CasaformaClassType;
