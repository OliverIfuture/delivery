const db = require('../config/config.js');

const Routine = {};

/**
 * Crea una nueva rutina
 * El objeto 'routine' debe tener: id_company, id_client, name, plan_data (JSON)
 */
Routine.create = (routine) => {
    const sql = `
        INSERT INTO routines(
            id_company,
            id_client,
            name,
            plan_data,
            is_active,
            created_at,
            updated_at
        )
        VALUES($1, $2, $3, $4, $5, $6, $7) RETURNING id
    `;
    return db.one(sql, [
        routine.id_company,
        routine.id_client,
        routine.name,
        routine.plan_data, // Este debe ser un objeto JSON (o un string JSON)
        routine.is_active ?? false, // Por defecto no está activa
        new Date(),
        new Date()
    ]);
};

/**
 * Actualiza una rutina
 * El objeto 'routine' debe tener: id (de la rutina), id_company, name, plan_data
 */
Routine.update = (routine) => {
    const sql = `
        UPDATE routines
        SET
            name = $1,
            plan_data = $2,
            updated_at = $3
        WHERE
            id = $4 AND id_company = $5 -- Doble validación de seguridad
    `;
    return db.none(sql, [
        routine.name,
        routine.plan_data,
        new Date(),
        routine.id,
        routine.id_company
    ]);
};

/**
 * Elimina una rutina.
 * Solo el entrenador que la creó puede eliminarla.
 */
Routine.delete = (id_routine, id_company) => {
    const sql = `
        DELETE FROM routines
        WHERE id = $1 AND id_company = $2
    `;
    return db.none(sql, [id_routine, id_company]);
};

/**
 * Activa una rutina.
 * Usa una transacción para asegurar que solo una rutina esté activa.
 */
Routine.setActive = (id_routine, id_client, id_company) => {
    // db.tx es la forma de pg-promise de manejar transacciones
    // Si algo falla, hace ROLLBACK automático.
    return db.tx(async t => {
        // 1. Desactivar todas las rutinas de este cliente
        await t.none(`
            UPDATE routines
            SET is_active = false, updated_at = $1
            WHERE id_client = $2 AND id_company = $3
        `, [new Date(), id_client, id_company]);
        
        // 2. Activar la rutina seleccionada
        await t.none(`
            UPDATE routines
            SET is_active = true, updated_at = $1
            WHERE id = $2 AND id_client = $3 AND id_company = $4
        `, [new Date(), id_routine, id_client, id_company]);
    });
};

/**
 * Busca todas las rutinas creadas por un entrenador
 * Se une con 'users' para obtener el nombre del cliente
 */
Routine.findByTrainer = (id_company) => {
    const sql = `
        SELECT
            r.id,
            r.id_company,
            r.id_client,
            r.name,
            r.is_active,
            r.plan_data,
            u.name as client_name,
            u.image as client_image
        FROM
            routines AS r
        INNER JOIN
            users AS u ON r.id_client = u.id
        WHERE
            r.id_company = $1
        ORDER BY
            r.updated_at DESC
    `;
    return db.manyOrNone(sql, id_company);
};

/**
 * Busca la rutina que está activa para un cliente
 */
Routine.findActiveByClient = (id_client) => {
    const sql = `
        SELECT
            r.*,
            c.name as trainer_name,
            c.logo as trainer_logo
        FROM
            routines AS r
        INNER JOIN
            companies AS c ON r.id_company = c.id
        WHERE
            r.id_client = $1 AND r.is_active = true
    `;
    // oneOrNone porque el cliente solo debe tener una activa
    return db.oneOrNone(sql, id_client); 
};


module.exports = Routine;
