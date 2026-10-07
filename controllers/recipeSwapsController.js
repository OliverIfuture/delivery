// controllers/recipeSwapsController.js
//
// Sustitución de ingredientes en una receta, por el cliente.
// Reglas de seguridad (todas se validan aquí, nunca en la app):
//  1. Solo el cliente con la receta ASIGNADA (client_diets_v2). La receta del entrenador
//     no se modifica: el cambio es personal y se guarda en client_recipe_swaps.
//  2. Los ingredientes son los que el cliente ve (snapshot de su dieta). La cantidad
//     original sale del snapshot del servidor, no de lo que mande la app.
//  3. Solo ingredientes con cantidad en gramos y catálogo en g/ml, del mismo grupo.
//  4. El reemplazo NO puede agregar alérgenos: sus alérgenos deben ser un subconjunto
//     de los del ingrediente original. Cualquier ingrediente marcado 'verificar' se excluye.
//  5. La cantidad del reemplazo la calcula el servidor (utils/ingredientSwap.js).
const RecipeSwap = require('../models/recipeSwap.js');
const { computeSwap, perGram } = require('../utils/ingredientSwap.js');

const MAX_OPTIONS = 15;
// Desviación máxima de energía aceptada. Por encima, el reemplazo no es equivalente.
const MAX_ENERGY_DEVIATION = 0.25;

function parseJsonArray(v) {
    if (Array.isArray(v)) return v;
    if (typeof v === 'string') { try { return JSON.parse(v); } catch (e) { return []; } }
    return [];
}

// Mismo producto (o entrada duplicada): cada macro difiere ≤ 1 g por cada 100 g,
// o ≤ 5% relativo en valores grandes.
function isSameProduct(a, b) {
    const pa = perGram(a), pb = perGram(b);
    if (!pa || !pb) return false;
    return ['kcal', 'protein', 'carbs', 'fats'].every((m) => {
        const absPer100 = Math.abs(pa[m] - pb[m]) * 100;
        const base = Math.max(Math.abs(pa[m]), 1e-9);
        return absPer100 <= 1.05 || Math.abs(pa[m] - pb[m]) / base <= 0.05;
    });
}

// Resuelve el ingrediente de la lista que ve el cliente y calcula las opciones válidas.
async function resolve(req, recipeId, ingredientIndex) {
    const recipe = await RecipeSwap.getRecipe(recipeId);
    if (!recipe) return { status: 404, error: 'Receta no encontrada' };

    const assignment = await RecipeSwap.getAssignedIngredients(Number(req.user.id), recipeId);
    if (!assignment) return { status: 403, error: 'Esta receta no está asignada a tu plan' };

    const items = parseJsonArray(assignment.custom_ingredients);
    const item = items[ingredientIndex];
    if (!item || !item.id_ingredient) return { status: 400, error: 'Ingrediente no válido' };
    const qty = Number(item.custom_qty);
    if (!(qty > 0) || item.unit !== 'g') return { status: 400, error: 'Este ingrediente no se puede sustituir' };

    const original = await RecipeSwap.getIngredient(item.id_ingredient);
    if (!original) return { status: 400, error: 'Ingrediente original no encontrado en el catálogo' };
    const originalAllergens = parseJsonArray(original.allergens);
    if (originalAllergens.includes('verificar')) return { status: 400, error: 'Este ingrediente no se puede sustituir' };

    const candidates = await RecipeSwap.candidatesInCategory(original.category, original.id_company, original.id);
    const evaluated = [];
    for (const cand of candidates) {
        const candAllergens = parseJsonArray(cand.allergens);
        if (candAllergens.includes('verificar')) continue;
        if (!candAllergens.every((a) => originalAllergens.includes(a))) continue;
        const swap = computeSwap(original, qty, cand);
        if (!swap) continue;
        if (swap.energyDeviation > MAX_ENERGY_DEVIATION) continue;
        if (isSameProduct(original, cand)) continue;
        evaluated.push({ cand, swap });
    }
    return { recipe, item, qty, original, evaluated };
}

function summarize(e) {
    return {
        id: e.cand.id,
        name: e.cand.name,
        grams: e.swap.grams,
        unit: 'g',
        result: {
            kcal: Math.round(e.swap.result.kcal),
            protein: Math.round(e.swap.result.protein * 10) / 10,
            carbs: Math.round(e.swap.result.carbs * 10) / 10,
            fats: Math.round(e.swap.result.fats * 10) / 10
        },
        energyDeviationPct: Math.round(e.swap.energyDeviation * 100)
    };
}

module.exports = {
    // GET /api/recipes/:id/swaps/options?ingredientIndex=i
    async options(req, res) {
        try {
            const idx = Number(req.query.ingredientIndex);
            if (!Number.isInteger(idx) || idx < 0) return res.status(400).json({ success: false, message: 'ingredientIndex no válido' });
            const r = await resolve(req, Number(req.params.id), idx);
            if (r.error) return res.status(r.status).json({ success: false, message: r.error });

            const list = r.evaluated
                .sort((a, b) => a.swap.energyDeviation - b.swap.energyDeviation)
                .slice(0, MAX_OPTIONS)
                .map(summarize);
            return res.status(200).json({
                success: true,
                data: {
                    original: { id: r.original.id, name: r.original.name, qty: r.qty, unit: 'g', category: r.original.category },
                    options: list
                }
            });
        } catch (error) {
            console.log(`Error en recipeSwapsController.options: ${error}`);
            return res.status(500).json({ success: false, message: 'Error al calcular las opciones' });
        }
    },

    // POST /api/recipes/:id/swaps  { ingredientIndex, replacementId }
    async save(req, res) {
        try {
            const recipeId = Number(req.params.id);
            const idx = Number(req.body.ingredientIndex);
            const replacementId = Number(req.body.replacementId);
            if (!Number.isInteger(idx) || idx < 0 || !Number.isInteger(replacementId)) {
                return res.status(400).json({ success: false, message: 'Datos no válidos' });
            }
            const r = await resolve(req, recipeId, idx);
            if (r.error) return res.status(r.status).json({ success: false, message: r.error });
            const row = r.evaluated.find((e) => Number(e.cand.id) === replacementId);
            if (!row) return res.status(400).json({ success: false, message: 'Ese ingrediente no es una opción válida para este cambio' });

            const saved = await RecipeSwap.upsert({
                id_client: Number(req.user.id),
                id_recipe: recipeId,
                ingredient_index: idx,
                original_ingredient_id: r.original.id,
                replacement_ingredient_id: row.cand.id,
                replacement_qty: row.swap.grams,
                replacement_unit: 'g',
                macros_snapshot: row.swap.result
            });
            return res.status(200).json({ success: true, data: { ingredientIndex: idx, ...summarize(row), saved: saved.id } });
        } catch (error) {
            console.log(`Error en recipeSwapsController.save: ${error}`);
            return res.status(500).json({ success: false, message: 'Error al guardar el cambio' });
        }
    },

    // DELETE /api/recipes/:id/swaps/:ingredientIndex  (vuelve al ingrediente original)
    async remove(req, res) {
        try {
            const recipeId = Number(req.params.id);
            const idx = Number(req.params.ingredientIndex);
            if (!Number.isInteger(idx) || idx < 0) return res.status(400).json({ success: false, message: 'Índice no válido' });
            const assignment = await RecipeSwap.getAssignedIngredients(Number(req.user.id), recipeId);
            const item = assignment && parseJsonArray(assignment.custom_ingredients)[idx];
            if (!item || !item.id_ingredient) return res.status(400).json({ success: false, message: 'Ingrediente no válido' });
            await RecipeSwap.remove(Number(req.user.id), recipeId, item.id_ingredient);
            return res.status(200).json({ success: true });
        } catch (error) {
            console.log(`Error en recipeSwapsController.remove: ${error}`);
            return res.status(500).json({ success: false, message: 'Error al quitar el cambio' });
        }
    },

    // GET /api/recipes/:id/swaps  (cambios activos del cliente, con la posición en su lista)
    async list(req, res) {
        try {
            const recipeId = Number(req.params.id);
            const rows = await RecipeSwap.listForClient(Number(req.user.id), recipeId);
            const assignment = await RecipeSwap.getAssignedIngredients(Number(req.user.id), recipeId);
            const items = assignment ? parseJsonArray(assignment.custom_ingredients) : [];
            return res.status(200).json({
                success: true,
                data: rows.map((r) => ({
                    ingredientIndex: items.findIndex((it) => Number(it.id_ingredient) === Number(r.original_ingredient_id)),
                    originalIngredientId: r.original_ingredient_id,
                    replacementId: r.replacement_ingredient_id,
                    replacementName: r.replacement_name,
                    grams: Number(r.replacement_qty),
                    unit: r.replacement_unit,
                    result: r.macros_snapshot
                })).filter((r) => r.ingredientIndex >= 0)
            });
        } catch (error) {
            console.log(`Error en recipeSwapsController.list: ${error}`);
            return res.status(500).json({ success: false, message: 'Error al obtener los cambios' });
        }
    }
};
