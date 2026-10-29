// models/casaformaSale.js — registra pagos de clientes (venta manual de
// punto de venta, o pagos reales de Stripe vía casaformaWebhookController)
// y asigna el paquete al cliente. Si el paquete es domiciliado, da de
// alta (o reactiva) el cargo recurrente en la misma transacción.
const db = require('../config/config');

const CasaformaSale = {};

function computeNextCharge(billingCycleDays) {
    const days = Number(billingCycleDays) || 30;
    const next = new Date();
    next.setDate(next.getDate() + days);
    return next;
}

// Núcleo compartido: registra el pago + asigna el paquete + suma el
// gasto del cliente + asegura la domiciliación si aplica. `stripeIds` es
// opcional (solo lo usan los pagos que sí vienen de Stripe de verdad).
async function recordPayment(userId, packageId, { amount, paymentMethod, stripePaymentIntentId, stripeSubscriptionId }) {
    return db.tx(async (t) => {
        const pkg = await t.oneOrNone('SELECT * FROM casaforma.casaforma_packages WHERE id = $1', [packageId]);
        if (!pkg) throw new Error('El paquete seleccionado no existe.');

        const user = await t.oneOrNone('SELECT id FROM casaforma.casaforma_users WHERE id = $1', [userId]);
        if (!user) throw new Error('El cliente no existe.');

        const finalAmount = amount ?? pkg.price;

        const payment = await t.one(
            `INSERT INTO casaforma.casaforma_payments(user_id, package_id, amount, payment_method, status, stripe_payment_intent_id, paid_at)
             VALUES($1, $2, $3, $4, 'completado', $5, NOW())
             RETURNING *`,
            [userId, packageId, finalAmount, paymentMethod, stripePaymentIntentId || null]
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
            [finalAmount, userId]
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
                     SET status = 'active', next_charge_date = $2, amount = $3, stripe_subscription_id = COALESCE($4, stripe_subscription_id), updated_at = NOW()
                     WHERE id = $1`,
                    [existing.id, nextCharge, finalAmount, stripeSubscriptionId || null]
                );
            } else {
                await t.none(
                    `INSERT INTO casaforma.casaforma_domiciliation_subscriptions(user_id, package_id, stripe_subscription_id, status, amount, next_charge_date, created_at, updated_at)
                     VALUES($1, $2, $3, 'active', $4, $5, NOW(), NOW())`,
                    [userId, packageId, stripeSubscriptionId || null, finalAmount, nextCharge]
                );
            }
        }

        return payment;
    });
}

// Venta manual de punto de venta (admin cobra en sucursal/transferencia).
CasaformaSale.createManualSale = (userId, packageId, paymentMethod) => {
    const label = (paymentMethod || 'Punto de venta');
    return recordPayment(userId, packageId, { paymentMethod: label });
};

// Pago único real de Stripe (payment_intent.succeeded) — ver
// casaformaWebhookController.js.
CasaformaSale.recordStripePayment = (userId, packageId, amount, stripePaymentIntentId) => {
    return recordPayment(userId, packageId, { amount, paymentMethod: 'Tarjeta · COBI', stripePaymentIntentId });
};

// Cobro domiciliado real de Stripe (invoice.payment_succeeded/paid) — ver
// casaformaWebhookController.js. Cada cobro recurrente registra SU
// PROPIO pago (para que el historial se vea igual que uno manual), pero
// la domiciliación (fila única por cliente+paquete) solo se actualiza,
// nunca se duplica.
CasaformaSale.recordStripeRecurringCharge = (userId, packageId, amount, stripeSubscriptionId) => {
    return recordPayment(userId, packageId, { amount, paymentMethod: 'Domiciliado · COBI', stripeSubscriptionId });
};

module.exports = CasaformaSale;
