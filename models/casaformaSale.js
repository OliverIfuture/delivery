// models/casaformaSale.js — venta manual de punto de venta (igual que
// EmoonSale.createManualSale): registra el pago, asigna el paquete al
// cliente, actualiza su gasto total, y si el paquete es domiciliado, da
// de alta (o reactiva) el cargo recurrente en la misma transacción.
const db = require('../config/config');

const CasaformaSale = {};

function computeNextCharge(billingCycleDays) {
    const days = Number(billingCycleDays) || 30;
    const next = new Date();
    next.setDate(next.getDate() + days);
    return next;
}

CasaformaSale.createManualSale = (userId, packageId, paymentMethod) => {
    return db.tx(async (t) => {
        const pkg = await t.oneOrNone('SELECT * FROM casaforma.casaforma_packages WHERE id = $1', [packageId]);
        if (!pkg) throw new Error('El paquete seleccionado no existe.');

        const user = await t.oneOrNone('SELECT id FROM casaforma.casaforma_users WHERE id = $1', [userId]);
        if (!user) throw new Error('El cliente no existe.');

        const methodLabel = (paymentMethod || 'Punto de venta') + (pkg.is_domiciliado ? ' · Domiciliado' : '');

        const payment = await t.one(
            `INSERT INTO casaforma.casaforma_payments(user_id, package_id, amount, payment_method, status, paid_at)
             VALUES($1, $2, $3, $4, 'completado', NOW())
             RETURNING *`,
            [userId, packageId, pkg.price, methodLabel]
        );

        const validityDays = pkg.validity_days || 30;
        const expirationDate = new Date();
        expirationDate.setDate(expirationDate.getDate() + validityDays);

        await t.none(
            `INSERT INTO casaforma.casaforma_user_packages(
                user_id, package_id, payment_id, activation_date, expiration_date, remaining_classes, status, created_at
             ) VALUES($1, $2, $3, CURRENT_DATE, $4, $5, 'active', NOW())`,
            [userId, packageId, payment.id, expirationDate, pkg.credits]
        );

        await t.none(
            `UPDATE casaforma.casaforma_users SET stats_total_spent = COALESCE(stats_total_spent, 0) + $1 WHERE id = $2`,
            [pkg.price, userId]
        );

        if (pkg.is_domiciliado) {
            const existing = await t.oneOrNone(
                `SELECT id FROM casaforma.casaforma_domiciliation_subscriptions WHERE user_id = $1 AND package_id = $2`,
                [userId, packageId]
            );
            const nextCharge = computeNextCharge(pkg.billing_cycle_days);
            if (existing) {
                await t.none(
                    `UPDATE casaforma.casaforma_domiciliation_subscriptions
                     SET status = 'active', next_charge_date = $2, amount = $3, updated_at = NOW()
                     WHERE id = $1`,
                    [existing.id, nextCharge, pkg.price]
                );
            } else {
                await t.none(
                    `INSERT INTO casaforma.casaforma_domiciliation_subscriptions(user_id, package_id, status, amount, next_charge_date, created_at, updated_at)
                     VALUES($1, $2, 'active', $3, $4, NOW(), NOW())`,
                    [userId, packageId, pkg.price, nextCharge]
                );
            }
        }

        return payment;
    });
};

module.exports = CasaformaSale;
