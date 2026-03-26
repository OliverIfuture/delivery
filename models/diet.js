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
 * Hace un JOIN con la tabla users para obtener el email del cliente, 
 * y con ese email busca en user_questionnaires.
 */
Diet.getClientQuestionnaire = (id_client) => {
    const sql = `
        SELECT uq.questionnaire_data 
        FROM user_questionnaires uq
        INNER JOIN users u ON u.email = uq.user_email
        WHERE u.id = $1
    `;
    return db.oneOrNone(sql, id_client);
};

/**
 * ASIGNACIÓN MÚLTIPLE DE RECETAS (TRANSACCIÓN)
 * Inserta en tu tabla 'client_diet_assignments'
 * Mapea 'meal_time' a 'assigned_meal_category' y 'notes' a 'extra_info'
 */
// EN TU MODELO DE NODE.JS

Diet.assignMultiple = (assignments) => {
    return db.tx('assign-multiple-diets', async t => {
        const queries = assignments.map(a => {
            return t.none(
                `INSERT INTO client_diets_v2 (
                    id_client, 
                    id_recipe, 
                    assigned_meal_category, 
                    custom_ingredients, 
                    final_calories, 
                    final_protein, 
                    final_carbs, 
                    final_fats, 
                    notes, 
                    created_at
                ) VALUES($1, $2, $3, $4::jsonb, $5, $6, $7, $8, $9, $10)`,
                [
                    a.id_client,
                    a.id_recipe,
                    a.assigned_meal_category || 'General', // <-- Corregido para leer lo que manda Flutter
                    JSON.stringify(a.custom_ingredients || []), // Convertimos el array a string JSON para Postgres
                    a.final_calories || 0,
                    a.final_protein || 0,
                    a.final_carbs || 0,
                    a.final_fats || 0,
                    a.notes || '',
                    new Date()
                ]
            );
        });
        return t.batch(queries);
    });
};
/**
 * HISTORIAL DE ASIGNACIONES
 * Lee de client_diet_assignments y renombra las columnas (AS) para que 
 * Flutter las reciba con los nombres que ya configuramos.
 */
Diet.getAssignedHistory = (id_company) => {
    const sql = `
        SELECT 
            cda.id, 
            cda.id_client, 
            cda.id_recipe, 
            cda.assigned_meal_category AS meal_time, 
            cda.extra_info AS notes, 
            cda.created_at,
            u.name as client_name,
            r.title as recipe_name
        FROM client_diet_assignments cda
        INNER JOIN users u ON cda.id_client = u.id
        INNER JOIN diet_recipes r ON cda.id_recipe = r.id
        WHERE u.mi_store = $1 -- Filtra para que el entrenador solo vea a sus clientes
        ORDER BY cda.created_at DESC
    `;
    return db.manyOrNone(sql, id_company);
};


Diet.getAssignedDietByClient = (id_client) => {
    // Esta consulta trae la dieta personalizada exacta que el entrenador armó
    const sql = `
    SELECT 
        cd.id AS id_assignment,
        cd.assigned_meal_category,
        cd.notes,
        cd.final_calories AS calories,
        cd.final_protein AS protein,
        cd.final_carbs AS carbs,
        cd.final_fats AS fats,
        cd.custom_ingredients,
        r.title,
        r.image_url,
        r.preparation_steps,
        u.target_calories        
    FROM client_diets_v2 cd
    INNER JOIN diet_recipes_v2 r ON cd.id_recipe = r.id
    INNER JOIN users u ON cd.id_client = u.id  -- UNIMOS AL USUARIO
    WHERE cd.id_client = $1
    ORDER BY 
        CASE cd.assigned_meal_category 
            WHEN 'Desayuno' THEN 1
            WHEN 'Snack' THEN 2
            WHEN 'Almuerzo' THEN 3
            WHEN 'Merienda' THEN 4
            WHEN 'Cena' THEN 5
            ELSE 6
        END;
`;

    return db.manyOrNone(sql, id_client);
};

Diet.getRecipesByCompany = (id_company) => {
    // Esta consulta trae la receta y empaca todos sus ingredientes en un arreglo JSON
    const sql = `
        SELECT 
            r.id,
            r.default_meal_category,
            r.title,
            r.image_url,
            r.total_calories AS calories,
            r.total_protein AS protein_grams,
            r.total_carbs AS carbs_grams,
            r.total_fats AS fat_grams,
            r.preparation_steps,
            (
                SELECT COALESCE(json_agg(
                    json_build_object(
                        'id_map', m.id,
                        'id_ingredient', i.id,
                        'name', i.name,
                        'unit', i.unit,
                        'base_qty', i.base_qty,
                        'prot_per_base', i.protein,
                        'carb_per_base', i.carbs,
                        'fat_per_base', i.fats,
                        'cal_per_base', i.calories,
                        'default_qty', m.default_qty
                    )
                ), '[]'::json)
                FROM recipe_ingredients_map m
                INNER JOIN master_ingredients i ON m.id_ingredient = i.id
                WHERE m.id_recipe = r.id
            ) AS intelligent_ingredients
        FROM diet_recipes_v2 r
        WHERE r.id_company = $1
        ORDER BY r.id DESC;
    `;

    return db.manyOrNone(sql, id_company);
};

module.exports = Diet;
