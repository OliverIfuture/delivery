// models/emoonSale.js
const db = require('../config/config');

const EmoonSale = {};

EmoonSale.createManualSale = async (userId, packageId, paymentMethod) => {
    // 1. Obtener detalles del paquete
    const pkg = await db.oneOrNone('SELECT * FROM emoon.emoon_packages WHERE id = $1', [packageId]);

    if (!pkg) {
        throw new Error('El paquete seleccionado no existe.');
    }

    // 2. Determinar cantidad de clases/créditos y vigencia con fallback seguro
    const credits = pkg.class_count || pkg.credits || 1;
    const validityDays = pkg.validity_days || 30;

    // 3. Registrar el pago en emoon_payments
    const paymentSql = `
        INSERT INTO emoon.emoon_payments (
            user_id, package_id, amount, payment_method, status, paid_at
        )
        VALUES ($1, $2, $3, $4, 'completado', NOW()) 
        RETURNING id;
    `;
    const payment = await db.one(paymentSql, [
        userId,
        packageId,
        pkg.price,
        paymentMethod || 'Punto de Venta'
    ]);

    // 4. Calcular fecha de expiración (Hoy + días de vigencia)
    const expirationDate = new Date();
    expirationDate.setDate(expirationDate.getDate() + parseInt(validityDays));

    // 5. Asignar los créditos poblando todas las variantes de columnas
    const userPkgSql = `
        INSERT INTO emoon.emoon_user_packages (
            user_id,
            package_id,
            payment_id,
            credits_total,
            credits_remaining,
            remaining_classes,
            class_count,
            activation_date,
            expiration_date,
            status,
            created_at
        )
        VALUES ($1, $2, $3, $4, $4, $4, $4, NOW(), $5, 'active', NOW()) 
        RETURNING *;
    `;
    const userPackage = await db.one(userPkgSql, [
        userId,
        packageId,
        payment.id,
        credits,
        expirationDate
    ]);

    return userPackage;
};

module.exports = EmoonSale;