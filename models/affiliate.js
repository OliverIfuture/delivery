const db = require('../config/config.js');

const Affiliate = {};

/**
 * **FUNCIÓN CORREGIDA (Paso 15.2)**
 * Crea un nuevo registro de comisión después de una venta exitosa.
 * @param {object} order - El objeto completo de la orden pagada.
 * @param {object} vendorCompany - El objeto 'company' de la Tienda que vendió.
 */
Affiliate.createCommission = (order, vendorCompany) => {
    
    // **CORRECCIÓN 1: La tasa de comisión viene de la tienda (vendorCompany)**
    // (Usamos 0.10 como un fallback de seguridad, pero NUNCA debería usarse)
    const commissionRate = parseFloat(vendorCompany.affiliateCommissionRate) || 0.10;
    
    // **CORRECCIÓN 2: El total viene de la orden (que ya calculamos en el controller)**
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
        vendorCompany.id,            // **CORRECCIÓN 3: El ID de la Tienda que vendió**
        order.id_client,             // El Cliente que compró
        order.total,                 // El total calculado
        commissionRate,              // La tasa dinámica de la tienda
        commission_amount,           // El monto de comisión calculado
        new Date()
    ]);
};

/**
 * Obtiene todas las comisiones ganadas por un afiliado (Entrenador)
 */
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

/**
 * **NUEVA FUNCIÓN: (Paso 15.8a)**
 * Obtiene un resumen de cuánto debe la Tienda (Vendedor) a cada Entrenador (Afiliado).
 * Agrupa todas las comisiones 'pending' por Entrenador.
 */
Affiliate.getPendingPayoutsByVendor = (id_company_vendor) => {
    const sql = `
        SELECT
            id_company_affiliate,
            c.name AS affiliate_name,
            c.logo AS affiliate_logo,
            SUM(commission_amount) AS total_pending_amount,
			U.notification_token
        FROM
            affiliate_commissions AS ac
        INNER JOIN
            company AS c ON ac.id_company_affiliate = c.id
	    INNER JOIN users as U on U.id = c.user_id	
        WHERE
            ac.id_company_vendor = $1 AND ac.status = 'pending'
        GROUP BY
            id_company_affiliate, c.name, c.logo, U.notification_token
        ORDER BY
            total_pending_amount DESC
    `;
    return db.manyOrNone(sql, id_company_vendor);
};

/**
 * **NUEVA FUNCIÓN: (Paso 15.8a)**
 * Marca todas las comisiones 'pending' de un afiliado específico
 * como 'paid' (pagadas).
 */
Affiliate.markAsPaid = (id_company_vendor, id_company_affiliate) => {
    const sql = `
        UPDATE affiliate_commissions
        SET status = 'paid', updated_at = $1
        WHERE
            id_company_vendor = $2
            AND id_company_affiliate = $3
            AND status = 'pending'
    `;
    return db.none(sql, [new Date(), id_company_vendor, id_company_affiliate]);
};

module.exports = Affiliate;
