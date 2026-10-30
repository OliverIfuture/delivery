// models/emoonDomiciliation.js — pagos domiciliados (cargo recurrente),
// puerto 1:1 de casaformaDomiciliation.js. El alta de una suscripción
// nueva vive en models/emoonSale.js (recordRecurringCharge, disparada
// por el webhook en controllers/clientSubscriptionsController.js) — este
// modelo solo administra lo que ya existe (pausar/reanudar/cancelar) y
// las reglas operativas, que viven en emoon_settings.domiciliation_rules.
//
// A diferencia de Casa Forma (Stripe Connect), Emoon no usa cuentas
// conectadas — las suscripciones viven directo en la cuenta principal de
// Stripe, pero la lógica de administración/recordatorios/escalación es
// idéntica.
const db = require('../config/config');

const EmoonDomiciliation = {};

const SELECT_JOINED = `
    SELECT
        s.id, s.user_id, s.package_id, s.status, s.amount,
        to_char(s.next_charge_date, 'YYYY-MM-DD') AS next_charge_date,
        u.first_name || ' ' || u.last_name AS client_name,
        u.email AS client_email,
        p.name AS package_name,
        p.billing_cycle_days
    FROM emoon.emoon_domiciliation_subscriptions s
    LEFT JOIN emoon.emoon_users u ON s.user_id = u.id
    LEFT JOIN emoon.emoon_packages p ON s.package_id = p.id
`;

EmoonDomiciliation.getSettings = async () => {
    const row = await db.one(`SELECT domiciliation_rules FROM emoon.emoon_settings WHERE id = 1`);
    return row.domiciliation_rules || { enabled: true, retryDays: 3, reminderDaysBefore: 2 };
};

EmoonDomiciliation.updateSettings = async (data) => {
    const current = await EmoonDomiciliation.getSettings();
    const merged = { ...current, ...data };
    await db.none(`UPDATE emoon.emoon_settings SET domiciliation_rules = $1, updated_at = NOW() WHERE id = 1`, [merged]);
    return merged;
};

EmoonDomiciliation.getAllSubscriptions = () => {
    return db.manyOrNone(`${SELECT_JOINED} ORDER BY s.created_at DESC`);
};

EmoonDomiciliation.getByUserId = (userId) => {
    return db.manyOrNone(`${SELECT_JOINED} WHERE s.user_id = $1 ORDER BY s.created_at DESC`, [userId]);
};

EmoonDomiciliation.getById = (id) => {
    return db.oneOrNone(`${SELECT_JOINED} WHERE s.id = $1`, [id]);
};

function computeNextCharge(billingCycleDays) {
    const days = Number(billingCycleDays) || 30;
    const next = new Date();
    next.setDate(next.getDate() + days);
    return next;
}

EmoonDomiciliation.toggleStatus = async (id, status) => {
    const sub = await db.oneOrNone(`SELECT s.*, p.billing_cycle_days FROM emoon.emoon_domiciliation_subscriptions s LEFT JOIN emoon.emoon_packages p ON s.package_id = p.id WHERE s.id = $1`, [id]);
    if (!sub) return null;

    const nextCharge = status === 'active' ? computeNextCharge(sub.billing_cycle_days) : null;
    await db.none(
        `UPDATE emoon.emoon_domiciliation_subscriptions SET status = $2, next_charge_date = $3, updated_at = NOW() WHERE id = $1`,
        [id, status, nextCharge]
    );
    return EmoonDomiciliation.getById(id);
};

EmoonDomiciliation.cancel = async (id) => {
    const result = await db.result(
        `UPDATE emoon.emoon_domiciliation_subscriptions SET status = 'cancelled', next_charge_date = NULL, updated_at = NOW() WHERE id = $1`,
        [id]
    );
    return result.rowCount > 0;
};

// Usados por controllers/clientSubscriptionsController.js (stripeWebhook)
// — los eventos reales de Stripe solo traen el stripe_subscription_id,
// nunca el id interno.
EmoonDomiciliation.findByStripeSubscriptionId = (stripeSubscriptionId) => {
    return db.oneOrNone(
        `SELECT * FROM emoon.emoon_domiciliation_subscriptions WHERE stripe_subscription_id = $1`,
        [stripeSubscriptionId]
    );
};

EmoonDomiciliation.cancelByStripeSubscriptionId = async (stripeSubscriptionId) => {
    const result = await db.result(
        `UPDATE emoon.emoon_domiciliation_subscriptions SET status = 'cancelled', next_charge_date = NULL, updated_at = NOW() WHERE stripe_subscription_id = $1`,
        [stripeSubscriptionId]
    );
    return result.rowCount > 0;
};

// ------------------------------------------------------------
// Automatización (ver jobs/emoonDomiciliationJob.js) — avisar antes del
// cobro y escalar tras varios días de cobro fallido.
// ------------------------------------------------------------

// invoice.payment_failed — arranca (o reinicia) el contador de "cuántos
// días lleva fallando" para esta suscripción.
EmoonDomiciliation.markPaymentFailed = async (stripeSubscriptionId) => {
    const row = await db.oneOrNone(
        `UPDATE emoon.emoon_domiciliation_subscriptions SET last_failed_at = NOW(), updated_at = NOW() WHERE stripe_subscription_id = $1 RETURNING id`,
        [stripeSubscriptionId]
    );
    if (!row) return null;
    return EmoonDomiciliation.getById(row.id);
};

// invoice.payment_succeeded / recordRecurringCharge — un cobro exitoso
// borra cualquier racha de fallas previa.
EmoonDomiciliation.clearPaymentFailed = (stripeSubscriptionId) => {
    return db.none(
        `UPDATE emoon.emoon_domiciliation_subscriptions SET last_failed_at = NULL, updated_at = NOW() WHERE stripe_subscription_id = $1`,
        [stripeSubscriptionId]
    );
};

// Activas cuyo próximo cobro cae dentro de la ventana de aviso
// (domiciliation_rules.reminderDaysBefore) y a las que todavía no se les
// mandó el aviso PARA ESE cobro en particular.
EmoonDomiciliation.getSubscriptionsNeedingReminder = (reminderDaysBefore) => {
    const sql = `
        ${SELECT_JOINED}
        WHERE s.status = 'active'
          AND s.next_charge_date IS NOT NULL
          AND s.next_charge_date BETWEEN CURRENT_DATE AND (CURRENT_DATE + ($1 || ' days')::interval)
          AND (s.last_reminder_sent_at IS NULL OR s.last_reminder_sent_at < (s.next_charge_date - ($1 || ' days')::interval))
    `;
    return db.manyOrNone(sql, [reminderDaysBefore]);
};

EmoonDomiciliation.markReminderSent = (id) => {
    return db.none(`UPDATE emoon.emoon_domiciliation_subscriptions SET last_reminder_sent_at = NOW() WHERE id = $1`, [id]);
};

// Llevan fallando >= retryDays días seguidos — se cancelan solas y se
// avisa al cliente.
EmoonDomiciliation.getSubscriptionsToEscalate = (retryDays) => {
    const sql = `
        ${SELECT_JOINED}
        WHERE s.status = 'active'
          AND s.last_failed_at IS NOT NULL
          AND s.last_failed_at <= (NOW() - ($1 || ' days')::interval)
    `;
    return db.manyOrNone(sql, [retryDays]);
};

module.exports = EmoonDomiciliation;
