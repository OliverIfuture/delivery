// models/masterIngredient.js
//
// NUEVO — CRUD real de `master_ingredients` (antes solo existían lecturas
// en models/diet.js: findByCompanyMasetr — no había NINGÚN camino para
// crear/editar/borrar un ingrediente, confirmado por grep en todo el
// backend). Los macros son "por base_qty de unit" (ej. "por 100 g", "por
// 1 scoop", "por 5 g") — mismo criterio ya usado por los 331 ingredientes
// reales existentes, no se inventa un formato nuevo.
//
// category/image_url/brand son columnas NUEVAS (migración aditiva, ver
// ALTER TABLE ... ADD COLUMN IF NOT EXISTS) — el resto de la tabla y sus
// 331 filas reales no se tocan.
const db = require('../config/config.js');

const MasterIngredient = {};

MasterIngredient.findById = (id) => {
    return db.oneOrNone(`
        SELECT id, id_company, name, unit, base_qty, calories, protein, carbs, fats, category, image_url, brand, created_at
        FROM master_ingredients WHERE id = $1
    `, [id]);
};

MasterIngredient.create = (ing) => {
    return db.one(`
        INSERT INTO master_ingredients (id_company, name, unit, base_qty, calories, protein, carbs, fats, category, image_url, brand)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING id, id_company, name, unit, base_qty, calories, protein, carbs, fats, category, image_url, brand, created_at
    `, [
        ing.id_company, ing.name, ing.unit || 'g', ing.base_qty ?? 100,
        ing.calories ?? 0, ing.protein ?? 0, ing.carbs ?? 0, ing.fats ?? 0,
        ing.category || null, ing.image_url || null, ing.brand || null
    ]);
};

MasterIngredient.update = (id, ing) => {
    return db.none(`
        UPDATE master_ingredients
        SET name = $2, unit = $3, base_qty = $4, calories = $5, protein = $6, carbs = $7, fats = $8,
            category = $9, image_url = $10, brand = $11
        WHERE id = $1
    `, [
        id, ing.name, ing.unit || 'g', ing.base_qty ?? 100,
        ing.calories ?? 0, ing.protein ?? 0, ing.carbs ?? 0, ing.fats ?? 0,
        ing.category || null, ing.image_url || null, ing.brand || null
    ]);
};

MasterIngredient.delete = (id) => {
    return db.none('DELETE FROM master_ingredients WHERE id = $1', [id]);
};

// Cuántas recetas usan este ingrediente — para explicarle al entrenador
// por qué no puede borrarlo (recipe_ingredients_map tiene FK real) en vez
// de dejar que le reviente un error crudo de Postgres.
MasterIngredient.countRecipeUsages = async (id) => {
    const row = await db.one('SELECT COUNT(*)::int AS n FROM recipe_ingredients_map WHERE id_ingredient = $1', [id]);
    return row.n;
};

module.exports = MasterIngredient;
