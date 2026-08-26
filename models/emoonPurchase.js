const db = require('../config/config');

const EmoonPurchase = {};

// Obtener el historial de compras/pagos de un usuario específico
EmoonPurchase.getByUserId = (userId) => {
    // Relación directa: emoon_payments -> emoon_packages a través de package_id
    const sql = `
        SELECT 
            p.id,
            p.paid_at AS purchase_date,
            p.amount,
            p.payment_method,
            p.status,
            COALESCE(pkg.name, 'Paquete / Servicio no encontrado') AS item_name
        FROM emoon.emoon_payments p
        LEFT JOIN emoon.emoon_packages pkg ON p.package_id = pkg.id
        WHERE p.user_id = $1
        ORDER BY p.paid_at DESC;
    `;
    return db.manyOrNone(sql, [userId]);
};

module.exports = EmoonPurchase;