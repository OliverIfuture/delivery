const db = require('../config/config.js');

const Wallet = {};

/**
 * Registra una recarga exitosa (Llamado desde el Webhook)
 * Usa una transacción para actualizar el balance Y guardar el historial de forma segura.
 */
Wallet.processTopUp = async (id_client, amount, reference_id) => {
    return db.tx(async t => {
        // 1. Insertar el registro en el historial (Ledger)
        const insertSql = `
            INSERT INTO wallet_transactions(
                id_user, amount, transaction_type, description, reference_id, created_at
            ) VALUES ($1, $2, 'top_up_stripe', 'Recarga de Premium Coins', $3, $4)
            RETURNING id;
        `;
        const transaction = await t.one(insertSql, [id_client, amount, reference_id, new Date()]);

        // 2. Sumar el monto al balance actual del usuario
        const updateSql = `
            UPDATE users 
            SET balance = COALESCE(balance, 0) + $1 
            WHERE id = $2
            RETURNING balance;
        `;
        await t.one(updateSql, [amount, id_client]);

        return transaction.id;
    });
};

/**
 * Obtiene el historial del usuario
 */
Wallet.getHistoryByUser = (id_client) => {
    const sql = `
        SELECT id, amount, transaction_type, description, created_at 
        FROM wallet_transactions 
        WHERE id_user = $1 
        ORDER BY created_at DESC
    `;
    return db.manyOrNone(sql, id_client);
};

module.exports = Wallet;