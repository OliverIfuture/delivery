const db = require('../config/config');

const EmoonPackage = {};

// Obtener todos los paquetes (Activos e Inactivos) para el panel de Admin
EmoonPackage.getAll = () => {
    const sql = `
        SELECT 
            id, name, type_id, price, credits, validity_days, description, is_active, min_age, created_at
        FROM emoon.emoon_packages where is_deleted = false
        ORDER BY created_at DESC
    `;
    return db.manyOrNone(sql);
};

// Crear un nuevo paquete
EmoonPackage.create = (pkg) => {
    const sql = `
        INSERT INTO emoon.emoon_packages(
            name, type_id, price, credits, validity_days, description, is_active, min_age, created_at
        ) VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *
    `;
    return db.oneOrNone(sql, [
        pkg.name,
        pkg.type_id,
        pkg.price,
        pkg.credits,
        pkg.validity_days,
        pkg.description,
        pkg.is_active !== false, // Por defecto true si no se especifica
        pkg.min_age || null,     // Edad mínima requerida (o null)
        new Date()
    ]);
};

// Actualizar paquete existente
EmoonPackage.update = (id, pkg) => {
    const sql = `
        UPDATE emoon.emoon_packages
        SET
            name = COALESCE($2, name),
            type_id = COALESCE($3, type_id),
            price = COALESCE($4, price),
            credits = COALESCE($5, credits),
            validity_days = COALESCE($6, validity_days),
            description = COALESCE($7, description),
            is_active = COALESCE($8, is_active),
            min_age = COALESCE($9, min_age)
        WHERE id = $1
        RETURNING *
    `;
    return db.oneOrNone(sql, [
        id,
        pkg.name,
        pkg.type_id,
        pkg.price,
        pkg.credits,
        pkg.validity_days,
        pkg.description,
        pkg.is_active,
        pkg.min_age
    ]);
};

EmoonPackage.delete = (id) => {
    const sql = `
        UPDATE emoon.emoon_packages
        SET is_deleted = TRUE
        WHERE id = $1
        RETURNING id
    `;
    return db.oneOrNone(sql, [id]);
};

module.exports = EmoonPackage;