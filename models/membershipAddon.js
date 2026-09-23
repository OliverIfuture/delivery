// models/membershipAddon.js
//
// NUEVO — complementos reales que se cobran aparte de la membresía base
// del entrenador (ej. "Flex Ilimitado"), en la MISMA fecha de corte que
// el plan base — por eso se agregan como un segundo "subscription item"
// dentro de la MISMA suscripción de Stripe (company.membership_stripe_
// subscription_id), no como una suscripción aparte. Tablas nuevas:
// membership_addons (catálogo) y company_addons (qué compañía tiene
// activo qué complemento, y el id real del subscription item en Stripe).
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
        SELECT ca.id, ca.id_addon, ca.stripe_subscription_item_id, ca.status, a.name, a.description, a.price
        FROM company_addons ca
        INNER JOIN membership_addons a ON a.id = ca.id_addon
        WHERE ca.id_company = $1 AND ca.status = 'active'
    `, [id_company]);
};

MembershipAddon.findCompanyAddon = (id_company, id_addon) => {
    return db.oneOrNone(`SELECT * FROM company_addons WHERE id_company = $1 AND id_addon = $2`, [id_company, id_addon]);
};

MembershipAddon.activate = (id_company, id_addon, stripeSubscriptionItemId) => {
    return db.none(`
        INSERT INTO company_addons(id_company, id_addon, stripe_subscription_item_id, status)
        VALUES($1, $2, $3, 'active')
        ON CONFLICT (id_company, id_addon) DO UPDATE SET stripe_subscription_item_id = $3, status = 'active'
    `, [id_company, id_addon, stripeSubscriptionItemId]);
};

MembershipAddon.deactivate = (id_company, id_addon) => {
    return db.none(`UPDATE company_addons SET status = 'canceled' WHERE id_company = $1 AND id_addon = $2`, [id_company, id_addon]);
};

module.exports = MembershipAddon;
