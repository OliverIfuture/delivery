const db = require('../config/config.js');

const Diet = {};

/**
 * Crea una nueva asignación de dieta
 * El objeto 'diet' debe tener: id_company, id_client, file_url, file_name
 */
Diet.createAssignment = (diet) => {
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


Diet.toggle = (id_user, id_recipe) => {
    return db.task('toggle-favorite', async t => {
        const sqlCheck = `
            SELECT id FROM user_favorite_recipes 
            WHERE id_user = $1 AND id_recipe = $2
        `;
        const existing = await t.oneOrNone(sqlCheck, [id_user, id_recipe]);

        if (existing) {
            const sqlDelete = `DELETE FROM user_favorite_recipes WHERE id = $1`;
            await t.none(sqlDelete, existing.id);
            return { action: 'removed', success: true };
        } else {
            const sqlInsert = `
                INSERT INTO user_favorite_recipes (id_user, id_recipe, created_at)
                VALUES ($1, $2, $3)
            `;
            await t.none(sqlInsert, [id_user, id_recipe, new Date()]);
            return { action: 'added', success: true };
        }
    });
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
/**
 * Busca la dieta activa de un cliente (la más reciente)
 * CORRECCIÓN: Usamos LEFT JOIN para traer la dieta aunque no tenga entrenador (IA)
 */
Diet.findActiveByClient = (id_client) => {
    const sql = `
        SELECT
            d.*,
            c.name as trainer_name,
            c.logo as trainer_logo
        FROM
            diets AS d
        LEFT JOIN
            company AS c ON d.id_company = c.id
        WHERE
            d.id_client = $1
        ORDER BY
            d.created_at DESC
        LIMIT 1
    `;
    return db.oneOrNone(sql, id_client);
};

Diet.createAIEntry = (data) => {
    const sql = `
        INSERT INTO ai_generated_diets(
            id_client,
            physiology_data,
            ai_analysis_result,
            created_at,
            updated_at
        )
        VALUES($1, $2, $3, $4, $5) RETURNING id
    `;
    return db.one(sql, [
        data.id_client,
        data.physiology_data,
        data.ai_analysis_result,
        new Date(),
        new Date()
    ]);
};

/**
 * Busca el análisis de IA más reciente de un cliente
 */
Diet.findLatestByClient = (id_client) => {
    const sql = `
        SELECT
            id,
            id_client,
            physiology_data,
            ai_analysis_result,
            created_at
        FROM
            ai_generated_diets
        WHERE
            id_client = $1
        ORDER BY
            created_at DESC
        LIMIT 1
    `;
    return db.oneOrNone(sql, id_client);
};

// 1. Crear registro PENDIENTE (Al recibir las fotos)
Diet.createPending = (id_client, physiology_data) => {
    const sql = `
        INSERT INTO ai_generated_diets(
            id_client,
            physiology_data,
            status,
            created_at,
            updated_at
        )
        VALUES($1, $2, 'pending', $3, $4) RETURNING id
    `;
    return db.one(sql, [id_client, physiology_data, new Date(), new Date()]);
};

// 2. Actualizar con el RESULTADO (Cuando Gemini termina)
Diet.updateResult = (id, jsonResult) => {
    const sql = `
        UPDATE ai_generated_diets
        SET ai_analysis_result = $2,
            status = 'completed',
            updated_at = $3
        WHERE id = $1
    `;
    return db.none(sql, [id, jsonResult, new Date()]);
};

// 3. Marcar como ERROR (Si Gemini falla)
Diet.updateError = (id) => {
    const sql = `
        UPDATE ai_generated_diets
        SET status = 'failed',
            updated_at = $2
        WHERE id = $1
    `;
    return db.none(sql, [id, new Date()]);
};

// 4. Consultar Estado (Polling)
Diet.findById = (id) => {
    const sql = `SELECT * FROM ai_generated_diets WHERE id = $1`; // CORRECTO
    return db.oneOrNone(sql, id);
};

/**
 * OBTENER RECETAS DE LA EMPRESA
 * Busca en la tabla diet_recipes por id_company
 */
Diet.getCompanyRecipes = (id_company) => {
    const sql = `
        SELECT * FROM diet_recipes 
        WHERE id_company = $1 
        ORDER BY created_at DESC
    `;
    return db.manyOrNone(sql, id_company);
};

/**
 * OBTENER CUESTIONARIO DEL CLIENTE
 * Extrae el JSON questionnaire_data de la tabla users
 */
Diet.getClientQuestionnaire = (id_client) => {
    const sql = `
        SELECT questionnaire_data 
        FROM users 
        WHERE id = $1
    `;
    return db.oneOrNone(sql, id_client);
};

/**
 * ASIGNACIÓN MÚLTIPLE DE RECETAS (TRANSACCIÓN)
 * Inserta un array de objetos en la tabla client_diets
 */
Diet.assignMultiple = (assignments) => {
    // Usamos db.tx para asegurar que o se guardan todas, o ninguna (Transacción segura)
    return db.tx('assign-multiple-diets', async t => {
        const queries = assignments.map(a => {
            return t.none(
                `INSERT INTO client_diets(
                    id_client, 
                    id_recipe, 
                    meal_time, 
                    notes, 
                    created_at
                ) VALUES($1, $2, $3, $4, $5)`,
                [
                    a.id_client,
                    a.id_recipe,
                    a.meal_time,
                    a.notes || '',
                    new Date()
                ]
            );
        });
        return t.batch(queries); // Ejecuta todas las inserciones
    });
};

/**
 * HISTORIAL DE ASIGNACIONES (CLIENT_DIETS)
 * Hace JOIN con users para filtrar por los clientes de este entrenador (mi_store)
 */
Diet.getAssignedHistory = (id_company) => {
    const sql = `
        SELECT 
            cd.id, 
            cd.id_client, 
            cd.id_recipe, 
            cd.meal_time, 
            cd.notes, 
            cd.created_at,
            u.name as client_name,
            r.name as recipe_name
        FROM client_diets cd
        INNER JOIN users u ON cd.id_client = u.id
        INNER JOIN diet_recipes r ON cd.id_recipe = r.id
        WHERE u.mi_store = $1 -- Filtra para que el entrenador solo vea a sus clientes
        ORDER BY cd.created_at DESC
    `;
    return db.manyOrNone(sql, id_company);
};

module.exports = Diet;
