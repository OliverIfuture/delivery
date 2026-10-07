// models/recipeSwap.js
//
// Sustituciones personales de ingredientes en recetas (tabla client_recipe_swaps,
// ver database/nutrition_recipe_swaps.sql). La receta del entrenador no se modifica.
const db = require('../config/config.js');

const RecipeSwap = {};

RecipeSwap.getRecipe = (id) => db.oneOrNone(
    'SELECT id, id_company, title FROM diet_recipes_v2 WHERE id = $1 AND is_deleted IS NOT TRUE',
    [id]
);

// Ingredientes que el cliente VE en esta receta: el snapshot de su dieta asignada
// (copiado de recipe_ingredients_map al asignar). Sin asignación = sin acceso.
RecipeSwap.getAssignedIngredients = (id_client, id_recipe) => db.oneOrNone(
    `SELECT id, custom_ingredients FROM client_diets_v2
     WHERE id_client = $1 AND id_recipe = $2
     ORDER BY id DESC LIMIT 1`,
    [id_client, id_recipe]
);

// Catálogo de solo lectura (las recetas no siempre comparten empresa con sus ingredientes).
RecipeSwap.getIngredient = (id) => db.oneOrNone(
    `SELECT id, id_company, name, unit, base_qty, calories, protein, carbs, fats, category, allergens
     FROM master_ingredients WHERE id = $1`,
    [id]
);

// Candidatos del mismo grupo dentro del mismo catálogo (misma empresa que el original).
RecipeSwap.candidatesInCategory = (category, catalogCompany, excludeId) => db.manyOrNone(
    `SELECT id, id_company, name, unit, base_qty, calories, protein, carbs, fats, category, allergens
     FROM master_ingredients
     WHERE category = $1 AND id_company IS NOT DISTINCT FROM $2 AND id <> $3
     ORDER BY name ASC`,
    [category, catalogCompany, excludeId]
);

RecipeSwap.upsert = (s) => db.one(
    `INSERT INTO client_recipe_swaps
        (id_client, id_recipe, ingredient_index, original_ingredient_id, replacement_ingredient_id,
         replacement_qty, replacement_unit, macros_snapshot)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb)
     ON CONFLICT (id_client, id_recipe, original_ingredient_id)
     DO UPDATE SET ingredient_index = EXCLUDED.ingredient_index,
                   replacement_ingredient_id = EXCLUDED.replacement_ingredient_id,
                   replacement_qty = EXCLUDED.replacement_qty,
                   replacement_unit = EXCLUDED.replacement_unit,
                   macros_snapshot = EXCLUDED.macros_snapshot,
                   created_at = NOW()
     RETURNING id, original_ingredient_id, replacement_ingredient_id, replacement_qty, replacement_unit, macros_snapshot`,
    [s.id_client, s.id_recipe, s.ingredient_index, s.original_ingredient_id, s.replacement_ingredient_id,
     s.replacement_qty, s.replacement_unit, JSON.stringify(s.macros_snapshot)]
);

RecipeSwap.remove = (id_client, id_recipe, original_ingredient_id) => db.result(
    'DELETE FROM client_recipe_swaps WHERE id_client = $1 AND id_recipe = $2 AND original_ingredient_id = $3',
    [id_client, id_recipe, original_ingredient_id]
);

RecipeSwap.listForClient = (id_client, id_recipe) => db.manyOrNone(
    `SELECT s.original_ingredient_id, s.replacement_ingredient_id, s.replacement_qty, s.replacement_unit,
            s.macros_snapshot, m.name AS replacement_name
     FROM client_recipe_swaps s
     LEFT JOIN master_ingredients m ON m.id = s.replacement_ingredient_id
     WHERE s.id_client = $1 AND s.id_recipe = $2`,
    [id_client, id_recipe]
);

module.exports = RecipeSwap;
