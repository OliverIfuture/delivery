const db = require('../config/config');

const EmoonPackage = {};

// Obtener todos los paquetes (Activos e Inactivos) para el panel de Admin
EmoonPackage.getAll = () => {
    const sql = `
        SELECT
            id, name, type_id, price, credits, validity_days, description, is_active, min_age, created_at,
            is_domiciliado, billing_cycle_days
        FROM emoon.emoon_packages where is_deleted = false
        ORDER BY created_at DESC
    `;
    return db.manyOrNone(sql);
};

// Crear un nuevo paquete
EmoonPackage.create = (pkg) => {
    const sql = `
        INSERT INTO emoon.emoon_packages(
            name, type_id, price, credits, validity_days, description, is_active, min_age, created_at,
            is_domiciliado, billing_cycle_days
        ) VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *
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
        new Date(),
        pkg.is_domiciliado === true,
        pkg.is_domiciliado ? (pkg.billing_cycle_days || 30) : null
    ]);
};

// Actualizar paquete existente
EmoonPackage.update = (id, pkg) => {
    // Validar si el campo min_age fue enviado explícitamente en la petición (incluso si viene null)
    const hasMinAge = Object.prototype.hasOwnProperty.call(pkg, 'min_age') || pkg.min_age !== undefined;

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
            min_age = CASE WHEN $10::boolean THEN $9 ELSE min_age END,
            is_domiciliado = COALESCE($11, is_domiciliado),
            billing_cycle_days = $12
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
        pkg.min_age !== undefined ? pkg.min_age : null,
        hasMinAge,
        pkg.is_domiciliado,
        pkg.is_domiciliado ? (pkg.billing_cycle_days || 30) : null
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

// Usado por emoonPaymentsController.js — el precio/producto de Stripe de
// un paquete domiciliado se crea una sola vez (lazy, en la primera
// compra) y se reutiliza después. Sin Connect: todo en la cuenta
// principal, a diferencia de Casa Forma.
EmoonPackage.getRaw = (id) => {
    return db.oneOrNone('SELECT * FROM emoon.emoon_packages WHERE id = $1 AND is_deleted = false', [id]);
};

EmoonPackage.savePriceIds = (id, stripeProductId, stripePriceId) => {
    return db.none(
        `UPDATE emoon.emoon_packages SET stripe_product_id = $2, stripe_price_id = $3 WHERE id = $1`,
        [id, stripeProductId, stripePriceId]
    );
};

module.exports = EmoonPackage;