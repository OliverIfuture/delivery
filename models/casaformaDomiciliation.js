// models/casaformaDomiciliation.js — pagos domiciliados (cargo
// recurrente), feature que Casa Forma tiene de más respecto a Emoon. El
// alta de una suscripción nueva vive en casaformaSale.js (se dispara
// sola cuando el cliente compra un paquete domiciliado) — este modelo
// solo administra lo que ya existe (pausar/reanudar/cancelar) y las
// reglas operativas, que viven en casaforma_settings.domiciliation_rules.
const db = require('../config/config');

const CasaformaDomiciliation = {};

const SELECT_JOINED = `
    SELECT
        s.id, s.user_id, s.package_id, s.status, s.amount,
        to_char(s.next_charge_date, 'YYYY-MM-DD') AS next_charge_date,
        u.first_name || ' ' || u.last_name AS client_name,
        u.email AS client_email,
        p.name AS package_name,
        p.billing_cycle_days
    FROM casaforma.casaforma_domiciliation_subscriptions s
    LEFT JOIN casaforma.casaforma_users u ON s.user_id = u.id
    LEFT JOIN casaforma.casaforma_packages p ON s.package_id = p.id
`;

CasaformaDomiciliation.getSettings = async () => {
    const row = await db.one(`SELECT domiciliation_rules FROM casaforma.casaforma_settings WHERE id = 1`);
    return row.domiciliation_rules || { enabled: true, retryDays: 3, reminderDaysBefore: 2 };
};

CasaformaDomiciliation.updateSettings = async (data) => {
    const current = await CasaformaDomiciliation.getSettings();
    const merged = { ...current, ...data };
    await db.none(`UPDATE casaforma.casaforma_settings SET domiciliation_rules = $1, updated_at = NOW() WHERE id = 1`, [merged]);
    return merged;
};

CasaformaDomiciliation.getAllSubscriptions = () => {
    return db.manyOrNone(`${SELECT_JOINED} ORDER BY s.created_at DESC`);
};

CasaformaDomiciliation.getByUserId = (userId) => {
    return db.manyOrNone(`${SELECT_JOINED} WHERE s.user_id = $1 ORDER BY s.created_at DESC`, [userId]);
};

CasaformaDomiciliation.getById = (id) => {
    return db.oneOrNone(`${SELECT_JOINED} WHERE s.id = $1`, [id]);
};

function computeNextCharge(billingCycleDays) {
    const days = Number(billingCycleDays) || 30;
    const next = new Date();
    next.setDate(next.getDate() + days);
    return next;
}

CasaformaDomiciliation.toggleStatus = async (id, status) => {
    const sub = await db.oneOrNone(`SELECT s.*, p.billing_cycle_days FROM casaforma.casaforma_domiciliation_subscriptions s LEFT JOIN casaforma.casaforma_packages p ON s.package_id = p.id WHERE s.id = $1`, [id]);
    if (!sub) return null;

    const nextCharge = status === 'active' ? computeNextCharge(sub.billing_cycle_days) : null;
    await db.none(
        `UPDATE casaforma.casaforma_domiciliation_subscriptions SET status = $2, next_charge_date = $3, updated_at = NOW() WHERE id = $1`,
        [id, status, nextCharge]
    );
    return CasaformaDomiciliation.getById(id);
};

CasaformaDomiciliation.cancel = async (id) => {
    const result = await db.result(
        `UPDATE casaforma.casaforma_domiciliation_subscriptions SET status = 'cancelled', next_charge_date = NULL, updated_at = NOW() WHERE id = $1`,
        [id]
    );
    return result.rowCount > 0;
};

// Usados por casaformaWebhookController.js — eventos reales de Stripe
// solo traen el stripe_subscription_id, nunca el id interno.
CasaformaDomiciliation.findByStripeSubscriptionId = (stripeSubscriptionId) => {
    return db.oneOrNone(
        `SELECT * FROM casaforma.casaforma_domiciliation_subscriptions WHERE stripe_subscription_id = $1`,
        [stripeSubscriptionId]
    );
};

CasaformaDomiciliation.cancelByStripeSubscriptionId = async (stripeSubscriptionId) => {
    const result = await db.result(
        `UPDATE casaforma.casaforma_domiciliation_subscriptions SET status = 'cancelled', next_charge_date = NULL, updated_at = NOW() WHERE stripe_subscription_id = $1`,
        [stripeSubscriptionId]
    );
    return result.rowCount > 0;
};

// ------------------------------------------------------------
// Automatización (ver jobs/casaformaDomiciliationJob.js) — avisar antes
// del cobro y escalar tras varios días de cobro fallido.
// ------------------------------------------------------------

// invoice.payment_failed — arranca (o reinicia) el contador de "cuántos
// días lleva fallando" para esta suscripción.
CasaformaDomiciliation.markPaymentFailed = async (stripeSubscriptionId) => {
    const row = await db.oneOrNone(
        `UPDATE casaforma.casaforma_domiciliation_subscriptions SET last_failed_at = NOW(), updated_at = NOW() WHERE stripe_subscription_id = $1 RETURNING id`,
        [stripeSubscriptionId]
    );
    if (!row) return null;
    return CasaformaDomiciliation.getById(row.id);
};

// invoice.payment_succeeded / recordStripeRecurringCharge — un cobro
// exitoso borra cualquier racha de fallas previa.
CasaformaDomiciliation.clearPaymentFailed = (stripeSubscriptionId) => {
    return db.none(
        `UPDATE casaforma.casaforma_domiciliation_subscriptions SET last_failed_at = NULL, updated_at = NOW() WHERE stripe_subscription_id = $1`,
        [stripeSubscriptionId]
    );
};

// Activas cuyo próximo cobro cae dentro de la ventana de aviso
// (domiciliation_rules.reminderDaysBefore) y a las que todavía no se
// les mandó el aviso PARA ESE cobro en particular — comparar
// last_reminder_sent_at contra (next_charge_date - reminderDays) es lo
// que evita reenviarlo varias veces dentro del mismo ciclo: una vez
// mandado, last_reminder_sent_at cae DENTRO de esa ventana y dejan de
// calificar hasta que next_charge_date avance al siguiente ciclo.
CasaformaDomiciliation.getSubscriptionsNeedingReminder = (reminderDaysBefore) => {
    const sql = `
        ${SELECT_JOINED}
        WHERE s.status = 'active'
          AND s.next_charge_date IS NOT NULL
          AND s.next_charge_date BETWEEN CURRENT_DATE AND (CURRENT_DATE + ($1 || ' days')::interval)
          AND (s.last_reminder_sent_at IS NULL OR s.last_reminder_sent_at < (s.next_charge_date - ($1 || ' days')::interval))
    `;
    return db.manyOrNone(sql, [reminderDaysBefore]);
};

CasaformaDomiciliation.markReminderSent = (id) => {
    return db.none(`UPDATE casaforma.casaforma_domiciliation_subscriptions SET last_reminder_sent_at = NOW() WHERE id = $1`, [id]);
};

// Llevan fallando >= retryDays días seguidos — se cancelan solas (igual
// que si el admin le diera "Cancelar") y se avisa al cliente.
CasaformaDomiciliation.getSubscriptionsToEscalate = (retryDays) => {
    const sql = `
        ${SELECT_JOINED}
        WHERE s.status = 'active'
          AND s.last_failed_at IS NOT NULL
          AND s.last_failed_at <= (NOW() - ($1 || ' days')::interval)
    `;
    return db.manyOrNone(sql, [retryDays]);
};

module.exports = CasaformaDomiciliation;
