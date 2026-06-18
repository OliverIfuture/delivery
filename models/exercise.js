const db = require('../config/config.js');

const Exercise = {};

/**
 * Crea un nuevo ejercicio
 */
Exercise.create = (exercise) => {
    const sql = `
        INSERT INTO exercises(
            id_company,
            name,
            description,
            muscle_group,
            equipment,
            media_url,
            thumbnail_url, -- 🔥 NUEVO CAMPO AÑADIDO
            media_type,
            created_at,
            updated_at
        )
        VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id
    `;

    return db.one(sql, [
        exercise.idCompany,
        exercise.name,
        exercise.description,
        exercise.muscle_group, // Cuidado con el snake_case, debe coincidir con lo que mandas desde Flutter
        exercise.equipment,
        exercise.media_url || null, // null si no hay link
        exercise.thumbnail_url || null, // null si no hay portada
        exercise.media_type,
        new Date(),
        new Date()
    ]);
};

/**
 * Actualiza un ejercicio
 */
Exercise.update = (exercise) => {
    const sql = `
        UPDATE exercises SET
            name = $2,
            description = $3,
            muscle_group = $4,
            equipment = $5,
            media_url = $6,
            thumbnail_url = $7,
            media_type = $8,
            updated_at = $9
        WHERE id = $1
    `;

    return db.none(sql, [
        exercise.id,
        exercise.name,
        exercise.description,
        exercise.muscle_group, // Ojo aquí: en el toJson() de Flutter lo mandamos como 'muscle_group'
        exercise.equipment,
        exercise.mediaUrl || exercise.media_url || null,
        exercise.thumbnail_url || null,
        exercise.media_type || exercise.mediaType, // Cacha ambos formatos
        new Date()
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
        media_type,
        thumbnail_url
    FROM
        exercises
    WHERE
       id_company IS NULL or id_company = $1 or id_company = 1
    ORDER BY
        muscle_group, name;
    `;
    return db.manyOrNone(sql, id_company);
};

/**
 * Elimina un ejercicio
 */
Exercise.delete = (id) => {
    // (Tu lógica de 'delete' existente...)
    const sql = `
        DELETE FROM exercises
        WHERE id = $1
    `;
    return db.none(sql, id);
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
        WHERE id_company IS NULL or id_company = 4
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

/**
 * Obtiene las variantes de un ejercicio específico (Bidireccional)
 */
Exercise.getVariants = (exerciseId) => {
    const sql = `
        SELECT e.* FROM exercises e
        JOIN exercise_variants v 
          ON e.id = v.id_exercise_variant OR e.id = v.id_exercise_base
        WHERE (v.id_exercise_base = $1 OR v.id_exercise_variant = $1)
          AND e.id != $1
        ORDER BY e.name ASC
    `;
    return db.manyOrNone(sql, exerciseId);
};


module.exports = Exercise;
