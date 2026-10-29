// models/casaformaPackage.js
const db = require('../config/config');

const CasaformaPackage = {};

const SELECT_JOINED = `
    SELECT
        p.id, p.name, p.name AS package_name, p.category_id, cat.name AS category_name,
        p.description, p.price, p.credits, p.type_id, p.validity_days, p.min_age,
        p.is_active, p.is_featured, p.is_domiciliado, p.billing_cycle_days, p.created_at
    FROM casaforma.casaforma_packages p
    LEFT JOIN casaforma.casaforma_class_categories cat ON p.category_id = cat.id
`;

CasaformaPackage.getAll = () => {
    const sql = `${SELECT_JOINED} WHERE p.is_deleted = false ORDER BY p.created_at DESC`;
    return db.manyOrNone(sql);
};

CasaformaPackage.getById = (id) => {
    const sql = `${SELECT_JOINED} WHERE p.id = $1`;
    return db.oneOrNone(sql, [id]);
};

CasaformaPackage.create = async (pkg) => {
    const sql = `
        INSERT INTO casaforma.casaforma_packages(
            name, category_id, description, price, credits, type_id, validity_days,
            min_age, is_active, is_featured, is_domiciliado, billing_cycle_days, created_at
        ) VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        RETURNING id
    `;
    const row = await db.one(sql, [
        pkg.name || pkg.package_name,
        pkg.category_id || null,
        pkg.description || null,
        pkg.price,
        pkg.credits ?? null,
        pkg.type_id || 'class_pack',
        pkg.validity_days || 30,
        pkg.min_age ?? null,
        pkg.is_active !== false,
        pkg.is_featured === true,
        pkg.is_domiciliado === true,
        pkg.is_domiciliado ? (pkg.billing_cycle_days || 30) : null,
        new Date()
    ]);
    return CasaformaPackage.getById(row.id);
};

CasaformaPackage.update = async (id, pkg) => {
    const sql = `
        UPDATE casaforma.casaforma_packages
        SET
            name = COALESCE($2, name),
            category_id = COALESCE($3, category_id),
            description = COALESCE($4, description),
            price = COALESCE($5, price),
            credits = $6,
            type_id = COALESCE($7, type_id),
            validity_days = COALESCE($8, validity_days),
            min_age = $9,
            is_active = COALESCE($10, is_active),
            is_featured = COALESCE($11, is_featured),
            is_domiciliado = COALESCE($12, is_domiciliado),
            billing_cycle_days = $13
        WHERE id = $1 AND is_deleted = false
        RETURNING id
    `;
    const row = await db.oneOrNone(sql, [
        id,
        pkg.name || pkg.package_name,
        pkg.category_id,
        pkg.description,
        pkg.price,
        pkg.credits ?? null,
        pkg.type_id,
        pkg.validity_days,
        pkg.min_age ?? null,
        pkg.is_active,
        pkg.is_featured,
        pkg.is_domiciliado,
        pkg.is_domiciliado ? (pkg.billing_cycle_days || 30) : null
    ]);
    if (!row) return null;
    return CasaformaPackage.getById(id);
};

// "Eliminar" un paquete es desactivarlo (is_active = false), nunca un
// DELETE real — así no se rompe el historial de clientes que ya lo tienen.
CasaformaPackage.deactivate = (id) => {
    const sql = `
        UPDATE casaforma.casaforma_packages
        SET is_active = false
        WHERE id = $1
        RETURNING id
    `;
    return db.oneOrNone(sql, [id]);
};

module.exports = CasaformaPackage;
