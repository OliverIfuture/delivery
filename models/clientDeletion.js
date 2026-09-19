// models/clientDeletion.js
//
// NUEVO — Borrado real de "Eliminar cliente" desde el panel del entrenador
// (Vue). Esta base de datos es COMPARTIDA por varios productos (tienda,
// gimnasio/POS, wallet, afiliados) además del panel de entrenador — un
// mismo `users.id` puede tener actividad real en cualquiera de ellos. Por
// eso el borrado se hace en dos pasos:
//
//   1. SIEMPRE se limpia todo lo que es del panel de entrenador (rutinas,
//      entrenamientos, métricas, fotos, dietas, suscripción, pagos, notas
//      privadas) — esto es lo único que "nos limpia la bd" de verdad.
//   2. Solo si el cliente NO tiene actividad real en otro producto, se
//      borra también su fila de `users` por completo. Si sí la tiene, se
//      le desvincula de este entrenador (id_entrenador/mi_store en NULL)
//      pero su cuenta y esos otros datos se quedan intactos — varias de
//      esas tablas tienen ON DELETE CASCADE hacia `users`, así que
//      borrar la cuenta sin este chequeo destruiría en silencio pedidos,
//      membresías de gimnasio, movimientos de wallet, comisiones de
//      afiliado o turnos de POS de otro producto.
const db = require('../config/config.js');

const ClientDeletion = {};

const CROSS_PRODUCT_CHECKS = [
    { table: 'orders', column: 'id_client', label: 'pedidos de tienda' },
    { table: 'gym_memberships', column: 'id_client', label: 'membresías de gimnasio' },
    { table: 'wallet_transactions', column: 'id_user', label: 'movimientos de wallet' },
    { table: 'affiliate_commissions', column: 'id_client_buyer', label: 'comisiones de afiliado' },
    { table: 'pos_sales', column: 'id_user_staff', label: 'ventas de POS como personal' },
    { table: 'pos_shifts', column: 'id_user_staff', label: 'turnos de POS como personal' },
    { table: 'points_log', column: 'id_user', label: 'historial de puntos' }
];

// Confirma que el cliente sea de verdad de este entrenador antes de tocar
// nada, y de paso trae su email (hace falta para limpiar user_questionnaires,
// que no tiene FK a users — se liga por email).
ClientDeletion.belongsToTrainer = (id_client, id_company) => {
    return db.oneOrNone(`SELECT id, email FROM users WHERE id = $1 AND id_entrenador = $2`, [id_client, id_company]);
};

ClientDeletion.getCrossProductActivity = async (id_client) => {
    const found = [];
    for (const check of CROSS_PRODUCT_CHECKS) {
        // Los nombres de tabla/columna son constantes fijas de este archivo
        // (no vienen del request), así que interpolarlos aquí es seguro.
        const row = await db.oneOrNone(
            `SELECT 1 FROM ${check.table} WHERE ${check.column} = $1 LIMIT 1`,
            [id_client]
        );
        if (row) found.push(check.label);
    }
    return found;
};

// Todo lo que es del panel de entrenador — una sola transacción: o se
// borra todo, o no se borra nada.
ClientDeletion.purgeTrainerData = (id_client, email) => {
    return db.tx(async (t) => {
        await t.none(`DELETE FROM client_subscriptions WHERE id_client = $1`, [id_client]);
        await t.none(`DELETE FROM payment_history WHERE id_client = $1`, [id_client]);
        await t.none(`DELETE FROM workout_logs WHERE id_client = $1`, [id_client]);
        await t.none(`DELETE FROM client_metrics_log WHERE id_client = $1`, [id_client]);
        await t.none(`DELETE FROM client_progress_photos WHERE id_client = $1`, [id_client]);
        await t.none(`DELETE FROM routines WHERE id_client = $1`, [id_client]);
        await t.none(`DELETE FROM diets WHERE id_client = $1`, [id_client]);
        await t.none(`DELETE FROM ai_generated_diets WHERE id_client = $1`, [id_client]);
        await t.none(`DELETE FROM client_nutrition_goals WHERE id_client = $1`, [id_client]);
        await t.none(`DELETE FROM client_nutrition_log WHERE id_client = $1`, [id_client]);
        await t.none(`DELETE FROM client_diets_v2 WHERE id_client = $1`, [id_client]);
        await t.none(`DELETE FROM client_diet_assignments WHERE id_client = $1`, [id_client]);
        await t.none(`DELETE FROM client_private_notes WHERE id_client = $1`, [id_client]);
        if (email) {
            await t.none(`DELETE FROM user_questionnaires WHERE user_email = $1`, [email]);
        }
    });
};

// Se usa cuando SÍ tiene actividad en otro producto: lo saca de la lista
// de clientes de este entrenador sin tocar su cuenta.
ClientDeletion.detachFromTrainer = (id_client) => {
    return db.none(`UPDATE users SET id_entrenador = NULL, mi_store = NULL WHERE id = $1`, [id_client]);
};

// Solo se llama cuando getCrossProductActivity() ya confirmó que no hay
// nada de otro producto en juego.
ClientDeletion.deleteAccount = (id_client) => {
    return db.none(`DELETE FROM users WHERE id = $1`, [id_client]);
};

module.exports = ClientDeletion;
