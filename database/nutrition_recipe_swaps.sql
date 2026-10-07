-- Sustitución de ingredientes en recetas (aditiva, no cambia datos existentes).
-- 1) Alérgenos del catálogo de ingredientes.
ALTER TABLE master_ingredients ADD COLUMN IF NOT EXISTS allergens JSONB;

-- 2) Ingredientes estructurados de cada receta (el texto `ingredients` sigue igual).
--    Formato: [{ "ingredient_id": 123, "qty": 150, "unit": "g", "text": "150g de yogur..." }]
ALTER TABLE diet_recipes ADD COLUMN IF NOT EXISTS ingredients_structured JSONB;

-- 3) Sustituciones personales del cliente. La receta del entrenador no se modifica.
CREATE TABLE IF NOT EXISTS client_recipe_swaps (
    id SERIAL PRIMARY KEY,
    id_client INTEGER NOT NULL,
    id_recipe INTEGER NOT NULL,
    ingredient_index INTEGER NOT NULL,
    original_ingredient_id INTEGER,
    replacement_ingredient_id INTEGER NOT NULL,
    replacement_qty NUMERIC NOT NULL,
    replacement_unit VARCHAR(20),
    macros_snapshot JSONB,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE (id_client, id_recipe, ingredient_index)
);

-- Revisión (aplicada): la fuente de ingredientes es recipe_ingredients_map, copiada a
-- client_diets_v2.custom_ingredients al asignar la dieta. Por eso:
--  a) las sustituciones se identifican por el ingrediente original (no por posición),
--  b) se retira ingredients_structured (duplicaba esa fuente).
ALTER TABLE client_recipe_swaps DROP CONSTRAINT IF EXISTS client_recipe_swaps_id_client_id_recipe_ingredient_index_key;
ALTER TABLE client_recipe_swaps ADD CONSTRAINT client_recipe_swaps_client_recipe_original_key UNIQUE (id_client, id_recipe, original_ingredient_id);
ALTER TABLE diet_recipes DROP COLUMN IF EXISTS ingredients_structured;

-- Macros del plan: cada cambio guarda cuánto modificó la receta (reemplazo - original).
-- Al guardar o quitar, se aplica el delta a client_diets_v2.final_* (reversible).
ALTER TABLE client_recipe_swaps ADD COLUMN IF NOT EXISTS macro_delta JSONB;
