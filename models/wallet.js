const db = require('../config/config.js');

const Wallet = {};

/**
 * Registra una recarga exitosa (Llamado desde el Webhook)
 * Usa una transacción para actualizar el balance Y guardar el historial de forma segura.
 */
Wallet.processTopUp = async (id_client, amount, reference_id) => {
    // --- 1. TRANSFORMACIÓN Y LIMPIEZA DE DATOS ---
    // Aseguramos que el ID sea un entero base 10 (elimina espacios o decimales raros)
    const parsedIdClient = parseInt(id_client, 10);
    // Aseguramos que el monto sea un número decimal/flotante
    const parsedAmount = parseFloat(amount);
    // Aseguramos que la referencia sea un string limpio
    const parsedRefId = reference_id ? String(reference_id).trim() : null;

    console.log(`\n[Wallet.processTopUp] ⚡ INICIANDO TRANSACCIÓN ⚡`);
    console.log(`[Datos Originales] ID: '${id_client}' | Monto: '${amount}'`);
    console.log(`[Datos Parseados]  ID: ${parsedIdClient} | Monto: ${parsedAmount}`);

    // --- 2. VALIDACIÓN ESTRICTA ---
    if (isNaN(parsedIdClient) || parsedIdClient <= 0) {
        throw new Error(`Abortando: ID de cliente inválido después del parseo (${parsedIdClient}).`);
    }
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
        throw new Error(`Abortando: Monto inválido o negativo (${parsedAmount}).`);
    }

    // --- 3. TRANSACCIÓN SQL ---
    return db.tx(async t => {
        // A) Insertar el registro en el historial (Ledger)
        const insertSql = `
            INSERT INTO wallet_transactions(
                id_user, amount, transaction_type, description, reference_id, created_at
            ) VALUES ($1, $2, 'top_up_stripe', 'Recarga de SETS Coins', $3, $4)
            RETURNING id;
        `;
        const transaction = await t.one(insertSql, [parsedIdClient, parsedAmount, parsedRefId, new Date()]);
        console.log(`[Wallet] ✅ INSERT historial OK. ID Transacción: ${transaction.id}`);

        // B) Sumar el monto al balance actual del usuario
        const updateSql = `
            UPDATE users 
            SET balance = COALESCE(balance, 0) + $1 
            WHERE id = $2
            RETURNING id, balance;
        `;

        // Usamos oneOrNone para atrapar el resultado exacto
        const updatedUser = await t.oneOrNone(updateSql, [parsedAmount, parsedIdClient]);

        // C) VERIFICACIÓN DE IMPACTO
        if (updatedUser) {
            console.log(`[Wallet] ✅ UPDATE users OK. Usuario ID: ${updatedUser.id} | NUEVO BALANCE BD: ${updatedUser.balance}`);
        } else {
            console.log(`[Wallet] ❌ ERROR CRÍTICO: No se encontró el usuario con id = ${parsedIdClient}.`);
            // Al lanzar este error dentro de db.tx, pg-promise hace un ROLLBACK AUTOMÁTICO.
            // Es decir, borra el INSERT que hicimos en el paso A para evitar inconsistencias.
            throw new Error(`El usuario ${parsedIdClient} no existe. Transacción revertida.`);
        }

        console.log(`[Wallet.processTopUp] ⚡ TRANSACCIÓN EXITOSA ⚡\n`);
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

Wallet.getBalance = (id_client) => {
    return db.oneOrNone('SELECT balance FROM users WHERE id = $1', id_client);
};

module.exports = Wallet;