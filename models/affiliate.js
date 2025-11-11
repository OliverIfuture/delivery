const db = require('../config/config.js');

const Affiliate = {};

/**
 * Crea un nuevo registro de comisión después de una venta exitosa.
 * @param {object} order - El objeto completo de la orden pagada.
 * @param {object} product - El primer producto (para obtener el id_company_vendor).
 * @param {number} commissionRate - Ej: 0.10 para 10%
 */
Affiliate.createCommission = (order, product, commissionRate = 0.10) => {
    
    // Calcular la comisión (Ej: 10% del total de la orden)
    const commission_amount = parseFloat(order.total) * commissionRate;

    const sql = `
        INSERT INTO affiliate_commissions(
            id_order,
            id_company_affiliate,
            id_company_vendor,
            id_client_buyer,
            order_total,
            commission_rate,
            commission_amount,
            status,
            created_at,
            updated_at
        )
        VALUES($1, $2, $3, $4, $5, $6, $7, 'pending', $8, $8)
        RETURNING id
    `;
    
    return db.one(sql, [
        order.id,
        order.affiliate_referral_id, // El Entrenador que refirió
        product.id_company,          // La Tienda que vendió
        order.id_client,             // El Cliente que compró
        order.total,
        commissionRate,
        commission_amount,
        new Date()
    ]);
};

Affiliate.getCommissionsByAffiliate = (id_company_affiliate) => {
    const sql = `
        SELECT
            ac.id,
            ac.id_order,
            ac.order_total,
            ac.commission_rate,
            ac.commission_amount,
            ac.status,
            ac.created_at,
            u.name AS client_buyer_name,
            c.name AS vendor_name
        FROM
            affiliate_commissions AS ac
        INNER JOIN
            users AS u ON ac.id_client_buyer = u.id
        INNER JOIN
            company AS c ON ac.id_company_vendor = c.id
        WHERE
            ac.id_company_affiliate = $1
        ORDER BY
            ac.created_at DESC
    `;
    return db.manyOrNone(sql, id_company_affiliate);
};

module.exports = Affiliate;
