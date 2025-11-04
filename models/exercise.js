const db = require('../config/config'); // Importar la conexión a la BD

const Exercise = {};

/**
 * Inserta un nuevo ejercicio en la base de datos.
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
        media_type,
        created_at,
        updated_at
    )
    VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id;
    `;
    
    return db.one(sql, [
        exercise.idCompany, // Asegúrate que coincida con tu modelo Flutter (idCompany)
        exercise.name,
        exercise.description,
        exercise.muscleGroup,
        exercise.equipment,
        exercise.mediaUrl,  // URL de Firebase
        exercise.mediaType,
        new Date(),
        new Date()
    ])
    .then(data => data.id) // Devuelve solo el ID generado
    .catch(err => {
        console.log('Error en Exercise.create SQL: ', err);
        throw err;
    });
};

/**
 * Busca todos los ejercicios por el ID de la compañía (entrenador).
 */
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


module.exports = Exercise;
