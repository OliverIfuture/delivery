const db = require('../config/config.js');

const ClientSubscription = {};

// 1. Crear suscripción (Puede recibir id_client como NULL si es registro nuevo)
ClientSubscription.create = (data) => {
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
            updated_at,
            temp_email -- Columna temporal para vinculación
        )
        VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id
    `;
    return db.one(sql, [
        data.id_client || null,
        data.id_company,
        data.id_plan,
        data.stripe_subscription_id,
        data.stripe_customer_id,
        data.status || 'active',
        data.current_period_end,
        new Date(),
        new Date(),
        data.temp_email || null
    ]);
};

// 2. Vincular suscripciones huérfanas al ID del nuevo usuario
ClientSubscription.bindToUser = (email, id_client) => {
    const sql = `
        UPDATE client_subscriptions 
        SET id_client = $2, temp_email = NULL
        WHERE temp_email = $1 AND id_client IS NULL
    `;
    return db.none(sql, [email.toLowerCase(), id_client]);
};

// Añade esto a tu modelo ClientSubscription

// Buscar suscripción por su ID de Stripe
ClientSubscription.findByStripeId = (stripe_subscription_id) => {
    const sql = `SELECT * FROM client_subscriptions WHERE stripe_subscription_id = $1`;
    return db.oneOrNone(sql, stripe_subscription_id);
};

// Actualizar el plan y fecha tras un upgrade/pago exitoso
ClientSubscription.updatePlanAndDate = (stripe_subscription_id, id_plan, current_period_end) => {
    const sql = `
        UPDATE client_subscriptions
        SET id_plan = $2,
            current_period_end = $3,
            updated_at = NOW()
        WHERE stripe_subscription_id = $1
    `;
    return db.none(sql, [stripe_subscription_id, id_plan, current_period_end]);
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
            cs.id,
            cs.id_plan,
            cs.stripe_subscription_id,
            cs.status,
            cs.current_period_end,
            p.name AS plan_name -- 🔥 Traemos el nombre del plan y lo llamamos 'plan_name'
        FROM
            client_subscriptions cs
        LEFT JOIN
            subscription_plans p ON cs.id_plan = p.id -- 🔥 Unimos con la tabla de planes
        WHERE
            cs.id_client = $1
            AND (cs.status = 'active' OR cs.status = 'past_due' OR cs.status = 'PENDING')
        ORDER BY
            cs.created_at DESC
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

ClientSubscription.createManual = (sub) => {
    // 🔍 --- LOGS DE DEPURACIÓN EXTREMA --- 🔍
    console.log("\n=== ⚡ INICIANDO ClientSubscription.createManual ⚡ ===");
    console.log("📦 Datos crudos recibidos (sub):", JSON.stringify(sub, null, 2));
    console.log("🎯 Valor exacto de sub.status:", sub.status);

    const timestamp = Date.now();
    const fakeSubId = `sub_MANUAL_${timestamp}`;
    const fakeCusId = `cus_MANUAL_${timestamp}`;
    const fakeInvoiceId = `inv_MANUAL_${timestamp}`; // 🔥 ID Falso para la factura

    // --- LÓGICA DE ESTADO DINÁMICO (REPS vs EFECTIVO) ---
    // Si Flutter nos manda un status (ej. 'active'), lo usamos. Si no, por defecto es 'PENDING'.
    const finalStatus = sub.status ? sub.status : 'PENDING';

    console.log("✅ Status final que se insertará en BD:", finalStatus);
    console.log("========================================================\n");

    // --- CÁLCULO DE FECHA DE VENCIMIENTO ---
    // 1. Obtener días del plan (o 30 por defecto si no viene)
    const durationDays = sub.duration_days ? parseInt(sub.duration_days) : 30;

    // 2. Calcular fecha actual + días
    const expirationDate = new Date();
    expirationDate.setDate(expirationDate.getDate() + durationDays);
    // ---------------------------------------

    // 🔥 USAMOS UNA TRANSACCIÓN (t) PARA ASEGURAR QUE AMBAS CONSULTAS SE EJECUTEN CON ÉXITO 🔥
    return db.tx(async t => {

        // 1. INSERTAR LA SUSCRIPCIÓN
        const sqlSub = `
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
            VALUES($1, $2, $3, $4, $5, $6, $7, $8, $8)
            RETURNING id
        `;

        const insertedSub = await t.one(sqlSub, [
            sub.id_client,      // $1
            sub.id_company,     // $2
            sub.id_plan,        // $3
            fakeSubId,          // $4: ID falso de subscripción
            fakeCusId,          // $5: ID falso de cliente
            finalStatus,        // $6: 'active' o 'PENDING'
            expirationDate,     // $7: Fecha de vencimiento
            new Date()          // $8: Fechas
        ]);

        // 2. OBTENER EL PRECIO DEL PLAN
        // Necesitamos saber cuánto costaba este plan para ponerlo en el payment_history
        const plan = await t.oneOrNone('SELECT price FROM subscription_plans WHERE id = $1', [sub.id_plan]);
        const amountPaid = plan && plan.price ? parseFloat(plan.price) : 0;

        // 3. INSERTAR EL HISTORIAL DE PAGO
        // Usamos tu hora de Tijuana como estándar
        const tijuanaDateString = new Date().toLocaleString('en-US', { timeZone: 'America/Tijuana' });

        const sqlHistory = `
            INSERT INTO payment_history (id_company, id_client, id_plan, stripe_subscription_id, stripe_invoice_id, amount, payment_date)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
        `;

        await t.none(sqlHistory, [
            sub.id_company,
            sub.id_client,
            sub.id_plan,
            fakeSubId,
            fakeInvoiceId,
            amountPaid,
            tijuanaDateString
        ]);

        console.log(`💰 Historial de pago (Manual) registrado: $${amountPaid} para la sub ${fakeSubId} a las ${tijuanaDateString}`);

        // Retornamos la respuesta original para que el Controller no falle
        return insertedSub;
    });
};
// Necesitarás esta para validar si ya existe una pendiente
ClientSubscription.findPendingByClient = (id_client, id_plan) => {
    const sql = `
        SELECT id FROM client_subscriptions 
        WHERE id_client = $1 AND id_plan = $2 AND status = 'PENDING'
    `;
    return db.oneOrNone(sql, [id_client, id_plan]);
}

ClientSubscription.findById = (id) => {
    const sql = `
    SELECT
        id,
        name,
        description,
        price,
        id_company,
        is_manual,
        "durationInDays"
    FROM
        subscription_plans
    WHERE
        id = $1
    `;
    return db.oneOrNone(sql, id);
}


module.exports = ClientSubscription;
