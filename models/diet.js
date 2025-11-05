const db = require('../config/config.js');

const Diet = {};

/**
 * Crea una nueva asignación de dieta
 * El objeto 'diet' debe tener: id_company, id_client, file_url, file_name
 */
Diet.create = (diet) => {
    const sql = `
        INSERT INTO diets(
            id_company,
            id_client,
            file_url,
            file_name,
            created_at
        )
        VALUES($1, $2, $3, $4, $5) RETURNING id
    `;
    return db.one(sql, [
        diet.id_company,
        diet.id_client,
        diet.file_url,
        diet.file_name,
        new Date()
    ]);
};

/**
 * Elimina una dieta.
 * Solo el entrenador que la creó puede eliminarla.
 */
Diet.delete = (id_diet, id_company) => {
    const sql = `
        DELETE FROM diets
        WHERE id = $1 AND id_company = $2
    `;
    return db.none(sql, [id_diet, id_company]);
};

/**
 * Busca todas las dietas creadas por un entrenador
 * Se une con 'users' para obtener el nombre del cliente
 */
Diet.findByTrainer = (id_company) => {
    const sql = `
        SELECT
            d.id,
            d.id_company,
            d.id_client,
            d.file_url,
            d.file_name,
            d.created_at,
            u.name as client_name,
            COALESCE(u.image, '') as client_image
        FROM
            diets AS d
        INNER JOIN
            users AS u ON d.id_client = u.id
        WHERE
            d.id_company = $1
        ORDER BY
            d.created_at DESC
    `;
    return db.manyOrNone(sql, id_company);
};

/**
 * Busca la dieta activa de un cliente (la más reciente)
 */
Diet.findActiveByClient = (id_client) => {
    const sql = `
        SELECT
            d.*,
            c.name as trainer_name,
            c.logo as trainer_logo
        FROM
            diets AS d
        INNER JOIN
            companies AS c ON d.id_company = c.id
        WHERE
            d.id_client = $1
        ORDER BY
            d.created_at DESC
        LIMIT 1 -- Obtiene solo la dieta más reciente
    `;
    return db.oneOrNone(sql, id_client); 
};


module.exports = Diet;
