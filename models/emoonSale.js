// models/emoonSale.js
const db = require('../config/config');

const EmoonSale = {};

EmoonSale.createManualSale = async (userId, packageId, paymentMethod) => {
    return db.tx(async (t) => {
        // 1. Obtener detalles del paquete
        const pkg = await t.oneOrNone('SELECT * FROM emoon.emoon_packages WHERE id = $1', [packageId]);

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
        const payment = await t.one(paymentSql, [
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
        const userPackage = await t.one(userPkgSql, [
            userId,
            packageId,
            payment.id,
            credits,
            expirationDate
        ]);

        // 6. Actualizar el gasto total acumulado del usuario
        await t.none(
            `UPDATE emoon.emoon_users
             SET stats_total_spent = COALESCE(stats_total_spent, 0) + $1
             WHERE id = $2`,
            [pkg.price, userId]
        );

        return userPackage;
    });
};

// Cobro domiciliado real de Stripe (invoice.payment_succeeded/paid) — ver
// controllers/clientSubscriptionsController.js (stripeWebhook, branch
// 'emoon_domiciliado_purchase'). A propósito NO reutiliza
// createManualSale/su INSERT: es código nuevo e independiente para no
// arriesgar el flujo de pago único ya probado en producción. Cada cobro
// recurrente registra SU PROPIO pago (para que el historial se vea igual
// que uno manual), pero la domiciliación (fila única por cliente+paquete)
// solo se actualiza, nunca se duplica.
EmoonSale.recordRecurringCharge = async (userId, packageId, amount, stripeSubscriptionId) => {
    return db.tx(async (t) => {
        const pkg = await t.oneOrNone('SELECT * FROM emoon.emoon_packages WHERE id = $1', [packageId]);
        if (!pkg) throw new Error('El paquete seleccionado no existe.');

        const credits = pkg.class_count || pkg.credits || 1;
        const validityDays = pkg.validity_days || 30;
        const finalAmount = amount ?? pkg.price;

        const payment = await t.one(
            `INSERT INTO emoon.emoon_payments (user_id, package_id, amount, payment_method, status, paid_at)
             VALUES ($1, $2, $3, 'Domiciliado', 'completado', NOW())
             RETURNING id`,
            [userId, packageId, finalAmount]
        );

        const expirationDate = new Date();
        expirationDate.setDate(expirationDate.getDate() + parseInt(validityDays));

        await t.none(
            `INSERT INTO emoon.emoon_user_packages (
                user_id, package_id, payment_id, credits_total, credits_remaining,
                remaining_classes, class_count, activation_date, expiration_date, status, created_at
             )
             VALUES ($1, $2, $3, $4, $4, $4, $4, NOW(), $5, 'active', NOW())`,
            [userId, packageId, payment.id, credits, expirationDate]
        );

        await t.none(
            `UPDATE emoon.emoon_users SET stats_total_spent = COALESCE(stats_total_spent, 0) + $1 WHERE id = $2`,
            [finalAmount, userId]
        );

        const nextCharge = new Date();
        nextCharge.setDate(nextCharge.getDate() + (pkg.billing_cycle_days || 30));

        const existing = await t.oneOrNone(
            `SELECT id FROM emoon.emoon_domiciliation_subscriptions WHERE user_id = $1 AND package_id = $2`,
            [userId, packageId]
        );
        if (existing) {
            await t.none(
                `UPDATE emoon.emoon_domiciliation_subscriptions
                 SET status = 'active', next_charge_date = $2, amount = $3, stripe_subscription_id = COALESCE($4, stripe_subscription_id), updated_at = NOW()
                 WHERE id = $1`,
                [existing.id, nextCharge, finalAmount, stripeSubscriptionId || null]
            );
        } else {
            await t.none(
                `INSERT INTO emoon.emoon_domiciliation_subscriptions(user_id, package_id, stripe_subscription_id, status, amount, next_charge_date, created_at, updated_at)
                 VALUES($1, $2, $3, 'active', $4, $5, NOW(), NOW())`,
                [userId, packageId, stripeSubscriptionId || null, finalAmount, nextCharge]
            );
        }

        return payment;
    });
};

module.exports = EmoonSale;