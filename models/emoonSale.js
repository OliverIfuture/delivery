// models/emoonSale.js
const db = require('../config/config');

const EmoonSale = {};

EmoonSale.createManualSale = async (userId, packageId, paymentMethod) => {
    // 1. Obtener los detalles del paquete (Para saber precio, créditos y vigencia)
    const pkg = await db.oneOrNone('SELECT * FROM emoon.emoon_packages WHERE id = $1', [packageId]);

    if (!pkg) {
        throw new Error('El paquete seleccionado no existe.');
    }

    // 2. Registrar el pago en emoon_payments
    const paymentSql = `
        INSERT INTO emoon.emoon_payments (
            user_id, package_id, amount, payment_method, status, paid_at
        )
        VALUES ($1, $2, $3, $4, $5, $6) RETURNING id
    `;
    const payment = await db.oneOrNone(paymentSql, [
        userId,
        packageId,
        pkg.price,
        paymentMethod,
        'completado',
        new Date()
    ]);

    // 3. Calcular fecha de expiración (Hoy + los días de vigencia del paquete)
    const expirationDate = new Date();
    expirationDate.setDate(expirationDate.getDate() + pkg.validity_days);

    // 4. Asignar los créditos al usuario en emoon_user_packages (El monedero real)
    const userPkgSql = `
        INSERT INTO emoon.emoon_user_packages (
            user_id, package_id, payment_id, credits_total, credits_remaining, activation_date, expiration_date, status
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *
    `;
    const userPackage = await db.oneOrNone(userPkgSql, [
        userId,
        packageId,
        payment.id,
        pkg.credits,
        pkg.credits, // Inicia con todos los créditos intactos
        new Date(),
        expirationDate,
        'active'
    ]);

    return userPackage;
};

module.exports = EmoonSale;