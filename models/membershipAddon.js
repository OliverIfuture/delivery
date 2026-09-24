// models/membershipAddon.js
//
// NUEVO — complementos reales del entrenador (ej. "Flex Ilimitado"). A
// diferencia del plan base, cada complemento es su PROPIA suscripción de
// Stripe (fecha de corte propia, según el día que se activó) — NO un
// segundo item dentro de la suscripción del plan base. Sin periodo de
// gracia (se cobra de inmediato al activarlo, con la tarjeta que ya se
// tiene guardada — ver activateAddon en el controller). Tablas:
// membership_addons (catálogo) y company_addons (qué compañía tiene
// activo qué complemento, y el id real de SU PROPIA suscripción).
const db = require('../config/config.js');

const MembershipAddon = {};

MembershipAddon.findAll = () => {
    return db.manyOrNone(`SELECT id, name, description, price, stripe_product_id, stripe_price_id FROM membership_addons ORDER BY price ASC`);
};

MembershipAddon.findById = (id) => {
    return db.oneOrNone(`SELECT id, name, description, price, stripe_product_id, stripe_price_id FROM membership_addons WHERE id = $1`, [id]);
};

MembershipAddon.saveStripeIds = (id, stripeProductId, stripePriceId) => {
    return db.none(`UPDATE membership_addons SET stripe_product_id = $2, stripe_price_id = $3 WHERE id = $1`, [id, stripeProductId, stripePriceId]);
};

MembershipAddon.findActiveByCompany = (id_company) => {
    return db.manyOrNone(`
        SELECT ca.id, ca.id_addon, ca.stripe_subscription_id, ca.status, ca.created_at, a.name, a.description, a.price
        FROM company_addons ca
        INNER JOIN membership_addons a ON a.id = ca.id_addon
        WHERE ca.id_company = $1 AND ca.status = 'active'
    `, [id_company]);
};

MembershipAddon.findCompanyAddon = (id_company, id_addon) => {
    return db.oneOrNone(`SELECT * FROM company_addons WHERE id_company = $1 AND id_addon = $2`, [id_company, id_addon]);
};

MembershipAddon.activate = (id_company, id_addon, stripeSubscriptionId) => {
    return db.none(`
        INSERT INTO company_addons(id_company, id_addon, stripe_subscription_id, status)
        VALUES($1, $2, $3, 'active')
        ON CONFLICT (id_company, id_addon) DO UPDATE SET stripe_subscription_id = $3, status = 'active'
    `, [id_company, id_addon, stripeSubscriptionId]);
};

MembershipAddon.deactivate = (id_company, id_addon) => {
    return db.none(`UPDATE company_addons SET status = 'canceled' WHERE id_company = $1 AND id_addon = $2`, [id_company, id_addon]);
};

module.exports = MembershipAddon;
