// models/emoonPackage.js
const db = require('../config/config');

const EmoonPackage = {};

// Obtener todos los paquetes (Activos e Inactivos) para el panel de Admin
EmoonPackage.getAll = () => {
    const sql = `
        SELECT 
            id, name, type_id, price, credits, validity_days, description, is_active, created_at
        FROM emoon.emoon_packages
        ORDER BY created_at DESC
    `;
    return db.manyOrNone(sql);
};

// Crear un nuevo paquete
EmoonPackage.create = (pkg) => {
    const sql = `
        INSERT INTO emoon.emoon_packages(
            name, type_id, price, credits, validity_days, description, is_active, created_at
        ) VALUES($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *
    `;
    return db.oneOrNone(sql, [
        pkg.name,
        pkg.type_id,
        pkg.price,
        pkg.credits,
        pkg.validity_days,
        pkg.description,
        pkg.is_active !== false, // Por defecto true si no se especifica
        new Date()
    ]);
};

module.exports = EmoonPackage;