const db = require('../config/config.js');

const ClientSubscription = {};

/**
 * Crea un nuevo registro de suscripción
 */
ClientSubscription.create = (sub) => {
    const sql = `
        INSERT INTO client_subscriptions(
            id_client,
            id_company,
            id_plan,
            stripe_subscription_id,
            stripe_customer_id,
            status,
            current_period_end,
            created_at,
            updated_at
        )
        VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9) 
        RETURNING id
    `;
    return db.one(sql, [
        sub.id_client,
        sub.id_company,
        sub.id_plan,
        sub.stripe_subscription_id,
        sub.stripe_customer_id,
        sub.status,
        sub.current_period_end, // Puede ser null
        new Date(),
        new Date()
    ]);
};

/**
 * Actualiza el estado de una suscripción (usado por el Webhook)
 */
ClientSubscription.updateStatus = (stripe_subscription_id, status) => {
    const sql = `
        UPDATE client_subscriptions
        SET
            status = $1,
            updated_at = $2
        WHERE
            stripe_subscription_id = $3
    `;
    return db.none(sql, [
        status,
        new Date(),
        stripe_subscription_id
    ]);
};

/**
 * Busca la suscripción activa de un cliente
 */
ClientSubscription.findActiveByClient = (id_client) => {
    const sql = `
        SELECT
            id,
            id_plan,
            stripe_subscription_id,
            status,
            current_period_end
        FROM
            client_subscriptions
        WHERE
            id_client = $1 
            AND (status = 'active' OR status = 'past_due') -- Aún se considera "activo" si el pago está retrasado
        ORDER BY
            created_at DESC
        LIMIT 1
    `;
    return db.oneOrNone(sql, id_client); 
};

// --- **NUEVAS FUNCIONES PARA EL SUPER-ADMIN** ---

/**
 * Obtiene el conteo total de suscripciones activas
 */
ClientSubscription.getTotalActiveSubscriptions = () => {
    const sql = `
        SELECT COUNT(*) FROM client_subscriptions
        WHERE status = 'active'
    `;
    return db.one(sql);
};

/**
 * Obtiene el ingreso total (suma de los planes activos)
 * (Esto es una simplificación, no un cálculo de ingresos reales,
 * pero sirve para el dashboard)
 */
ClientSubscription.getTotalRevenue = () => {
    const sql = `
        SELECT SUM(p.price) 
        FROM client_subscriptions AS cs
        JOIN subscription_plans AS p ON cs.id_plan = p.id
        WHERE cs.status = 'active'
    `;
    return db.one(sql);
};


module.exports = ClientSubscription;
