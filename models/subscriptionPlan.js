const db = require('../config/config.js');

const SubscriptionPlan = {};

// NUEVO — para la página pública de pago de COBI (sin login): solo los
// campos seguros para mostrar/cobrar (nada de ids internos de más).
SubscriptionPlan.findPublicByCompany = (id_company) => {
    const sql = `
        SELECT
            id, name, description, price, currency, "durationInDays",
            payment_type, billing_mode, trial_period_days, stripe_price_id
        FROM subscription_plans
        WHERE id_company = $1 AND active = true
        ORDER BY price ASC
    `;
    return db.manyOrNone(sql, [id_company]);
};

// =========================================================================
// NUEVO — "COBI PAYMENTS" (panel Vue). Crea el plan ya con Stripe Connect
// real (no la llave suelta `company.stripeSecretKey` que usa el `create`
// de abajo) más los 3 campos nuevos (payment_type/billing_mode/
// trial_period_days) — ver controllers/subscriptionPlansController.js
// createConnect() para el detalle de cómo arma stripe_product_id/
// stripe_price_id antes de llamar aquí.
SubscriptionPlan.createV2 = (plan) => {
    const sql = `
        INSERT INTO subscription_plans(
            id_company, name, price, currency, stripe_product_id, stripe_price_id,
            created_at, updated_at, description, is_manual, "durationInDays",
            payment_type, billing_mode, trial_period_days
        )
        VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        RETURNING id
    `;
    return db.one(sql, [
        plan.id_company,
        plan.name,
        plan.price,
        plan.currency || 'mxn',
        plan.stripe_product_id,
        plan.stripe_price_id,
        new Date(),
        new Date(),
        plan.description,
        plan.is_manual,
        plan.durationInDays,
        plan.payment_type,
        plan.billing_mode,
        plan.trial_period_days
    ]);
};

// Lista completa (con los campos nuevos) para el propio dashboard del
// entrenador en "COBI PAYMENTS" — findByCompanyDash (de abajo) no trae
// payment_type/billing_mode/trial_period_days/is_manual, así que no sirve
// para mostrar esos badges en la UI de gestión.
SubscriptionPlan.findByCompanyManaged = (id_company) => {
    const sql = `
        SELECT
            id, id_company, name, description, price, currency,
            stripe_product_id, stripe_price_id, "durationInDays",
            is_manual, active, payment_type, billing_mode, trial_period_days, created_at
        FROM subscription_plans
        WHERE id_company = $1 AND active = true
        ORDER BY created_at DESC
    `;
    return db.manyOrNone(sql, [id_company]);
};

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
            updated_at,
            description,
            is_manual,
            "durationInDays"
        )
        VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING id
    `;
    return db.one(sql, [
        plan.id_company,
        plan.name,
        plan.price,
        plan.currency || 'mxn',
        plan.stripe_product_id,
        plan.stripe_price_id,
        new Date(),
        new Date(),
        plan.description,
        plan.is_manual,
        plan.durationInDays
    ]);
};

/**
 * Elimina un plan
 */
SubscriptionPlan.delete = (id_plan, id_company) => {
    const sql = `
        UPDATE public.subscription_plans
        	SET  active = false
        WHERE id = $1 AND id_company = $2
    `;
    return db.none(sql, [id_plan, id_company]);
};

SubscriptionPlan.createExpense = (expense) => {
    const sql = `
        INSERT INTO company_expenses(
            id_company,
            description,
            amount,
            expense_date,
            category,
            created_at
        )
        VALUES($1, $2, $3, $4, $5, $6) RETURNING id
    `;
    return db.one(sql, [
        expense.id_company,
        expense.description,
        expense.amount,
        expense.expense_date,
        expense.category || 'General',
        new Date()
    ]);
};

// 2. Traer Gastos por Compañía y Rango de Fechas
SubscriptionPlan.findByCompanyAndDateRange = (id_company, startDate, endDate) => {
    const sql = `
        SELECT 
            id,
            id_company,
            description,
            amount,
            expense_date,
            category,
            created_at
        FROM company_expenses
        WHERE id_company = $1 
        AND expense_date >= $2 
        AND expense_date <= $3
        ORDER BY expense_date DESC
    `;
    return db.manyOrNone(sql, [id_company, startDate, endDate]);
};

// 3. Eliminar Gasto
SubscriptionPlan.deleteExpense = (id_expense, id_company) => {
    // Aquí hacemos un borrado físico, aunque podrías hacer un borrado lógico (active = false)
    const sql = `
        DELETE FROM company_expenses
        WHERE id = $1 AND id_company = $2
    `;
    return db.none(sql, [id_expense, id_company]);
};

/**
 * Busca todos los planes de un entrenador
 */
SubscriptionPlan.findByCompany = (id_company) => {
    let sql = '';

    // Si el id de la compañía (entrenador) es 1, aplicamos el filtro específico
    if (id_company == 1) {
        sql = `
            SELECT
                id,
                id_company,
                name,
                description,
                price,
                currency,
                stripe_product_id,
                stripe_price_id,
                "durationInDays"
            FROM
                subscription_plans
            WHERE
                id_company = $1 AND id IN (331, 464)
            ORDER BY
                price desc;
        `;
    } else {
        // Si es cualquier otro entrenador, le traemos TODOS sus planes
        sql = `
            SELECT
                id,
                id_company,
                name,
                description,
                price,
                currency,
                stripe_product_id,
                stripe_price_id,
                "durationInDays"
            FROM
                subscription_plans
            WHERE
                id_company = $1
            ORDER BY
                price desc;
        `;
    }

    // Ejecutamos la consulta pasándole el parámetro
    return db.manyOrNone(sql, [id_company]);
};

SubscriptionPlan.findByCompanyDash = (id_company) => {
    const sql = `
        SELECT
            id,
            id_company,
            name,
            description,
            price,
            currency,
            stripe_product_id,
            stripe_price_id,
            "durationInDays"
            FROM
            subscription_plans
        WHERE
            id_company = $1 and active = true
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

SubscriptionPlan.findManualByCompany = (id_company) => {
    const sql = `
    SELECT
        id,
        name,
        description,
        price
    FROM
        subscription_plans
    WHERE
        id_company = $1
        AND (
            is_manual = true 
            OR stripe_price_id = 'MANUAL' 
            OR stripe_price_id IS NULL
        )
    `;
    return db.manyOrNone(sql, id_company);
}

/**
 * Busca un plan por su ID (Público, no requiere id_company)
 */
SubscriptionPlan.findByIdPublic = (id_plan) => {
    const sql = `
        SELECT
            id,
            id_company,
            name,
            description,
            price,
            currency,
            stripe_product_id,
            stripe_price_id,
            "durationInDays",
            is_manual
        FROM
            subscription_plans
        WHERE
            id = $1 AND active = true
    `;
    return db.oneOrNone(sql, id_plan);
}

// 2. ACTUALIZAR PLAN CON IDS DE STRIPE (PARA LA MIGRACIÓN)
SubscriptionPlan.updateStripeIds = (id, stripeProductId, stripePriceId) => {
    const sql = `
    UPDATE
        subscription_plans
    SET
        stripe_product_id = $2,
        stripe_price_id = $3,
        is_manual = false,
        updated_at = NOW()
    WHERE
        id = $1
    `;
    return db.none(sql, [id, stripeProductId, stripePriceId]);
}


module.exports = SubscriptionPlan;
