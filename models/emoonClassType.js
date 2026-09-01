const db = require('../config/config');

const EmoonClassType = {};

EmoonClassType.getAll = () => {
    const sql = `
        SELECT 
            id, category_id, name, description, duration_minutes, max_capacity, intensity, is_active, created_at
        FROM emoon.emoon_class_types
        WHERE is_deleted IS NOT TRUE
        ORDER BY created_at DESC
    `;
    return db.manyOrNone(sql);
};

EmoonClassType.create = (cls) => {
    const sql = `
        INSERT INTO emoon.emoon_class_types(
            category_id, name, description, duration_minutes, max_capacity, intensity, is_active, is_deleted, created_at
        ) VALUES($1, $2, $3, $4, $5, $6, $7, false, $8) RETURNING *
    `;
    return db.oneOrNone(sql, [
        cls.category_id,
        cls.name,
        cls.description,
        cls.duration_minutes,
        cls.max_capacity,
        cls.intensity || 'Todos los niveles',
        cls.is_active !== false,
        new Date()
    ]);
};

EmoonClassType.update = (id, cls) => {
    const sql = `
        UPDATE emoon.emoon_class_types
        SET
            category_id = COALESCE($2, category_id),
            name = COALESCE($3, name),
            description = COALESCE($4, description),
            duration_minutes = COALESCE($5, duration_minutes),
            max_capacity = COALESCE($6, max_capacity),
            intensity = COALESCE($7, intensity),
            is_active = COALESCE($8, is_active)
        WHERE id = $1
        RETURNING *
    `;
    return db.oneOrNone(sql, [
        id, cls.category_id, cls.name, cls.description, cls.duration_minutes, cls.max_capacity, cls.intensity, cls.is_active
    ]);
};

EmoonClassType.delete = (id) => {
    const sql = `
        UPDATE emoon.emoon_class_types
        SET is_deleted = true
        WHERE id = $1
        RETURNING *
    `;
    return db.oneOrNone(sql, [id]);
};

module.exports = EmoonClassType;