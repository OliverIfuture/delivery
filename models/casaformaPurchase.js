// models/casaformaPurchase.js — lecturas de casaforma_payments. Dos
// shapes distintas a propósito (ver src/api/purchasesProvider.js del
// frontend): snake_case para el cliente, camelCase para el admin.
const db = require('../config/config');

const CasaformaPurchase = {};

CasaformaPurchase.getByUserId = (userId) => {
    const sql = `
        SELECT
            pay.id, pay.user_id, pay.amount, pay.payment_method, pay.status,
            to_char(pay.paid_at, 'YYYY-MM-DD') AS purchase_date,
            COALESCE(pkg.name, 'Paquete / Servicio no encontrado') AS item_name,
            u.first_name || ' ' || u.last_name AS client_name,
            u.email AS client_email
        FROM casaforma.casaforma_payments pay
        LEFT JOIN casaforma.casaforma_packages pkg ON pay.package_id = pkg.id
        LEFT JOIN casaforma.casaforma_users u ON pay.user_id = u.id
        WHERE pay.user_id = $1
        ORDER BY pay.paid_at DESC
    `;
    return db.manyOrNone(sql, [userId]);
};

CasaformaPurchase.getAllAdmin = () => {
    const sql = `
        SELECT
            pay.id,
            to_char(pay.paid_at, 'YYYY-MM-DD"T"HH24:MI:SS') AS date,
            pay.stripe_payment_intent_id AS "stripeId",
            pay.stripe_receipt_url AS "receiptUrl",
            pay.amount,
            COALESCE(pay.payment_method, 'No especificado') AS method,
            pay.status,
            COALESCE(u.first_name || ' ' || u.last_name, 'Usuario Desconocido') AS "clientName",
            COALESCE(u.email, 'Sin correo') AS "clientEmail",
            COALESCE(pkg.name, 'Paquete / Servicio eliminado') AS "packageName"
        FROM casaforma.casaforma_payments pay
        LEFT JOIN casaforma.casaforma_users u ON pay.user_id = u.id
        LEFT JOIN casaforma.casaforma_packages pkg ON pay.package_id = pkg.id
        ORDER BY pay.paid_at DESC
    `;
    return db.manyOrNone(sql);
};

module.exports = CasaformaPurchase;
