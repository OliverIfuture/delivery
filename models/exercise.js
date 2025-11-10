const db = require('../config/config.js');

const Exercise = {};

/**
 * Crea un nuevo ejercicio
 */
Exercise.create = (exercise) => {
    // (Tu lógica de 'create' existente...)
    // Esta función debe existir en tu archivo
    const sql = `
        INSERT INTO exercises(
            id_company,
            name,
            description,
            muscle_group,
            equipment,
            media_url,
            media_type,
            created_at,
            updated_at
        )
        VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id
    `;
    return db.one(sql, [
        exercise.idCompany,
        exercise.name,
        exercise.description,
        exercise.muscle_group,
        exercise.equipment,
        exercise.media_url,
        exercise.media_type,
        new Date(),
        new Date()
    ]);
};

/**
 * Actualiza un ejercicio
 */
Exercise.update = (exercise) => {
    // (Tu lógica de 'update' existente...)
    const sql = `
        UPDATE exercises
        SET
            name = $2,
            description = $3,
            muscle_group = $4,
            equipment = $5,
            media_url = $6,
            media_type = $7,
            updated_at = $8
        WHERE
            id = $1 AND id_company = $9
    `;
    return db.none(sql, [
        exercise.id,
        exercise.name,
        exercise.description,
        exercise.muscle_group,
        exercise.equipment,
        exercise.media_url,
        exercise.media_type,
        new Date(),
        exercise.idCompany
    ]);
};

Exercise.findByCompany = (id_company) => {
    const sql = `
    SELECT
        id,
        id_company,
        name,
        description,
        muscle_group,
        equipment,
        media_url,
        media_type
    FROM
        exercises
    WHERE
        id_company = $1
    ORDER BY
        muscle_group, name;
    `;
    return db.manyOrNone(sql, id_company);
};

/**
 * Elimina un ejercicio
 */
Exercise.delete = (id, id_company) => {
    // (Tu lógica de 'delete' existente...)
    const sql = `
        DELETE FROM exercises
        WHERE id = $1 AND id_company = $2
    `;
    return db.none(sql, [id, id_company]);
};

/**
 * Obtiene los ejercicios de una compañía MÁS los globales
 */
Exercise.getByCompany = (id_company) => {
    const sql = `
        SELECT * FROM exercises
        WHERE id_company = $1 OR id_company IS NULL
        ORDER BY name ASC
    `;
    return db.manyOrNone(sql, id_company);
};

/**
 * NUEVO: Obtiene SOLO los ejercicios globales (para usuarios freemium)
 */
Exercise.getGlobalExercises = () => {
    const sql = `
        SELECT * FROM exercises
        WHERE id_company IS NULL
        ORDER BY name ASC
    `;
    return db.manyOrNone(sql);
};

/**
 * **NUEVA FUNCIÓN: Cuenta los ejercicios de un entrenador**
 */
Exercise.countByCompany = (id_company) => {
    const sql = `
        SELECT COUNT(*) FROM exercises WHERE id_company = $1
    `;
    return db.one(sql, id_company);
};


module.exports = Exercise;
