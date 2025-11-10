const db = require('../config/config.js');

const Routine = {};

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
        routine.id_company, // Puede ser null ahora
        routine.id_client,
        routine.name,
        routine.plan_data,
        routine.is_active ?? false,
        new Date(),
        new Date()
    ]);
};

Routine.update = (routine) => {
    const sql = `
        UPDATE routines
        SET
            name = $1,
            plan_data = $2,
            updated_at = $3
        WHERE
            id = $4 
            -- Eliminamos la restricción de id_company aquí para permitir auto-edición
    `;
    return db.none(sql, [
        routine.name,
        routine.plan_data,
        new Date(),
        routine.id
    ]);
};

Routine.delete = (id_routine) => {
    const sql = `
        DELETE FROM routines
        WHERE id = $1
    `;
    return db.none(sql, [id_routine]);
};

Routine.setActive = (id_routine, id_client) => {
    return db.tx(async t => {
        // 1. Desactivar todas las rutinas de este cliente
        await t.none(`
            UPDATE routines
            SET is_active = false, updated_at = $1
            WHERE id_client = $2
        `, [new Date(), id_client]);
        
        // 2. Activar la rutina seleccionada
        await t.none(`
            UPDATE routines
            SET is_active = true, updated_at = $1
            WHERE id = $2 AND id_client = $3
        `, [new Date(), id_routine, id_client]);
    });
};

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
            COALESCE(u.image, '') as client_image
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

Routine.findActiveByClient = (id_client) => {
    const sql = `
        SELECT
            r.*,
            c.name as trainer_name,
            c.logo as trainer_logo
        FROM
            routines AS r
        LEFT JOIN -- LEFT JOIN porque ahora puede no tener compañía
            company AS c ON r.id_company = c.id
        WHERE
            r.id_client = $1 AND r.is_active = true
    `;
    return db.oneOrNone(sql, id_client); 
};

module.exports = Routine;
