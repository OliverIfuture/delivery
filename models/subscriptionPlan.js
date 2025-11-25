const db = require('../config/config.js');

const SubscriptionPlan = {};

/**
 * Crea un nuevo plan de suscripción
 */
SubscriptionPlan.create = (plan) => {
    const sql = `
        INSERT INTO subscription_plans(
            id_company,
            name,
            price,
            currency,
            stripe_product_id,
            stripe_price_id,
            created_at,
            updated_at
        )
        VALUES($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id
    `;
    return db.one(sql, [
        plan.id_company,
        plan.name,
        plan.price,
        plan.currency || 'mxn',
        plan.stripe_product_id,
        plan.stripe_price_id,
        new Date(),
        new Date()
    ]);
};

/**
 * Elimina un plan
 */
SubscriptionPlan.delete = (id_plan, id_company) => {
    const sql = `
        DELETE FROM subscription_plans
        WHERE id = $1 AND id_company = $2
    `;
    return db.none(sql, [id_plan, id_company]);
};

/**
 * Busca todos los planes de un entrenador
 */
SubscriptionPlan.findByCompany = (id_company) => {
    const sql = `
        SELECT
            id,
            id_company,
            name,
            price,
            currency,
            stripe_product_id,
            stripe_price_id,
            description
        FROM
            subscription_plans
        WHERE
            id_company = $1
        ORDER BY
            price ASC
    `;
    return db.manyOrNone(sql, id_company);
};

/**
 * Busca un plan por su ID (usado en el delete)
 */
SubscriptionPlan.findById = (id_plan, id_company) => {
    const sql = `
        SELECT * FROM subscription_plans
        WHERE id = $1 AND id_company = $2
    `;
    return db.oneOrNone(sql, [id_plan, id_company]);
};


SubscriptionPlan.countByCompany = (id_company) => {
    const sql = `
        SELECT COUNT(*) FROM subscription_plans WHERE id_company = $1
    `;
    return db.one(sql, id_company);
};


module.exports = SubscriptionPlan;
