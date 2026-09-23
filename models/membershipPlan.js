// models/membershipPlan.js
//
// NUEVO — planes reales de membresía de la PLATAFORMA (lo que paga un
// entrenador para usar Trainer Partners, no los planes que él le vende a
// sus propios clientes — eso es subscriptionPlan.js/company). Tabla
// `membership_plans` ya existía (id, name, duration_in_months, price,
// ispromo) con 3 filas reales (fundador/monthly/quarterly) — se le
// agregaron por migración aditiva 3 columnas nuevas: stripe_product_id,
// stripe_price_id (se llenan solas la primera vez que se cobra un plan,
// ver membershipController.createCheckout) y client_limit (límite real
// de clientes de ese plan, antes solo vivía como texto dentro de "name").
const db = require('../config/config.js');

const MembershipPlan = {};

MembershipPlan.findAll = () => {
    return db.manyOrNone(`
        SELECT id, name, duration_in_months, price, ispromo, client_limit, stripe_product_id, stripe_price_id
        FROM membership_plans
        ORDER BY price ASC
    `);
};

MembershipPlan.findById = (id) => {
    return db.oneOrNone(`
        SELECT id, name, duration_in_months, price, ispromo, client_limit, stripe_product_id, stripe_price_id
        FROM membership_plans
        WHERE id = $1
    `, [id]);
};

MembershipPlan.saveStripeIds = (id, stripeProductId, stripePriceId) => {
    return db.none(`
        UPDATE membership_plans
        SET stripe_product_id = $2, stripe_price_id = $3
        WHERE id = $1
    `, [id, stripeProductId, stripePriceId]);
};

module.exports = MembershipPlan;
