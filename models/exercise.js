const db = require('../config/config.js');

const Exercise = {};

// **FUNCIÓN PARA CREAR UN EJERCICIO**
Exercise.create = (exercise) => {
    // **CORRECCIÓN: Se usa exercise.idCompany (camelCase) que viene de la app**
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
    VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id;
    `;

    return db.oneOrNone(sql, [
        exercise.id_company, // <-- CORREGIDO
        exercise.name,
        exercise.description,
        exercise.muscleGroup,
        exercise.equipment,
        exercise.mediaUrl,
        exercise.mediaType,
        new Date(),
        new Date()
    ]);
};

// **FUNCIÓN PARA OBTENER EJERCICIOS POR COMPAÑÍA (ENTRENADOR)**
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

// **FUNCIÓN PARA ACTUALIZAR UN EJERCICIO**
Exercise.update = (exercise) => {
    const sql = `
    UPDATE
        exercises
    SET
        name = $2,
        description = $3,
        muscle_group = $4,
        equipment = $5,
        media_url = $6,
        media_type = $7,
        updated_at = $8
    WHERE
        id = $1;
    `;
    return db.none(sql, [
        exercise.id,
        exercise.name,
        exercise.description,
        exercise.muscleGroup,
        exercise.equipment,
        exercise.mediaUrl,
        exercise.mediaType,
        new Date()
    ]);
};

module.exports = Exercise;

