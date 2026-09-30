// controllers/nutritionPlanController.js
//
// NUEVO — ver models/nutritionPlan.js para el porqué. Guarda la metadata
// completa del plan (nutrition_plans, tabla nueva) para que el entrenador
// pueda reabrir/editarlo, y cuando el plan queda activo, refleja el efecto
// real sobre el cliente reutilizando SIN TOCAR los mecanismos que la app
// del cliente ya lee de verdad: users.target_calories/protein/carbs/fats
// y client_diets_v2 (vía Diet.assignMultiple, pre-existente).
const db = require('../config/config.js');
const NutritionPlan = require('../models/nutritionPlan.js');
const Diet = require('../models/diet.js');

async function ownsClient(id_client, id_company) {
    const row = await db.oneOrNone('SELECT id_entrenador FROM users WHERE id = $1', [id_client]);
    return !!row && Number(row.id_entrenador) === Number(id_company);
}
async function ownsPlan(id_plan, id_company) {
    const row = await NutritionPlan.findById(id_plan);
    if (!row) return false;
    if (Number(row.id_company) === Number(id_company)) return true;
    return ownsClient(row.id_client, id_company);
}

function planMacroGrams(target_kcal, macro_percents) {
    const kcal = Number(target_kcal) || 0;
    const mp = macro_percents || {};
    return {
        prot: Math.round((kcal * (Number(mp.prot) || 0) / 100) / 4),
        cho: Math.round((kcal * (Number(mp.cho) || 0) / 100) / 4),
        lip: Math.round((kcal * (Number(mp.lip) || 0) / 100) / 9)
    };
}

// Snapshot de los ingredientes REALES de una receta, en la forma que ya
// espera el frontend real (recipeEditDraft.customIngredients, ver
// ClientDetailView.vue) — id_ingredient/custom_qty para los cálculos de
// macros + name/unit para que se puedan mostrar sin tener que volver a
// consultar master_ingredients. getAssignedDietByClient (la consulta que
// de verdad lee la app del cliente) nunca hace join con
// recipe_ingredients_map — solo lee esta columna ya guardada, así que si
// se guarda vacía el cliente ve el platillo sin ningún ingrediente.
async function recipeIngredientsSnapshot(id_recipe) {
    const rows = await Diet.getRecipeIngredients(id_recipe);
    return rows.map((r) => ({
        id_ingredient: r.id_ingredient,
        custom_qty: Number(r.default_qty) || 0,
        name: r.name,
        unit: r.unit,
        calories: Number(r.calories) || 0,
        protein: Number(r.protein) || 0,
        carbs: Number(r.carbs) || 0,
        fats: Number(r.fats) || 0
    }));
}

// Traduce las sugerencias de menú del plan (recetas reales ya elegidas por
// tiempo de comida, ver generateMealSuggestions en useNutritionAi.js del
// frontend) al formato que ya espera Diet.assignMultiple — mismo mecanismo
// que usa "asignar receta" en RecetasView/ClientDetailView, así que el
// cliente lo ve en su app exactamente igual que una asignación manual.
async function buildAssignmentsFromPlan(plan) {
    const grams = planMacroGrams(plan.target_kcal, plan.macro_percents);
    const mealNameById = {};
    (plan.meal_times || []).forEach((m) => { mealNameById[m.id] = m.name; });

    const picks = [];
    const suggestions = plan.suggestions || {};
    Object.keys(suggestions).forEach((mealId) => {
        const mealName = mealNameById[mealId] || 'General';
        (suggestions[mealId] || []).forEach((s) => {
            if (s && s.recipeId) picks.push({ s, mealName });
        });
    });

    // Una misma receta puede repetirse en varios tiempos de comida — no
    // hace falta pedir sus ingredientes más de una vez.
    const uniqueRecipeIds = [...new Set(picks.map((p) => p.s.recipeId))];
    const ingredientsByRecipe = {};
    await Promise.all(uniqueRecipeIds.map(async (id) => {
        ingredientsByRecipe[id] = await recipeIngredientsSnapshot(id);
    }));

    return picks.map(({ s, mealName }) => ({
        id_client: plan.id_client,
        id_recipe: s.recipeId,
        assigned_meal_category: mealName,
        custom_ingredients: ingredientsByRecipe[s.recipeId] || [],
        final_calories: Math.round(Number(s.kcal) || 0),
        final_protein: Math.round(Number(s.prot) || 0),
        final_carbs: Math.round(Number(s.cho) || 0),
        final_fats: Math.round(Number(s.lip) || 0),
        notes: plan.notes || '',
        target_calories: Math.round(Number(plan.target_kcal) || 0),
        target_protein: grams.prot,
        target_carbs: grams.cho,
        target_fats: grams.lip
    }));
}

// Cuando el plan queda activo, refleja SIEMPRE el objetivo de calorías/
// macros en users (aunque todavía no haya ninguna receta elegida) y, si ya
// hay sugerencias reales, también las asigna en client_diets_v2.
async function applyActivePlanEffects(plan) {
    const assignments = await buildAssignmentsFromPlan(plan);
    if (assignments.length) {
        await Diet.assignMultiple(assignments);
        return;
    }
    const grams = planMacroGrams(plan.target_kcal, plan.macro_percents);
    await db.none(
        'UPDATE users SET target_calories = $2, target_protein = $3, target_carbs = $4, target_fats = $5 WHERE id = $1',
        [plan.id_client, Math.round(Number(plan.target_kcal) || 0), grams.prot, grams.cho, grams.lip]
    );
}

module.exports = {
    async getMyClientPlans(req, res) {
        try {
            const id_company = req.user.mi_store;
            const id_client = req.params.id_client;
            if (!(await ownsClient(id_client, id_company))) {
                return res.status(403).json({ success: false, message: 'Ese cliente no es tuyo.' });
            }
            const rows = await NutritionPlan.findByClient(id_client);
            return res.status(200).json({ success: true, data: rows });
        } catch (error) {
            console.log(`Error en nutritionPlanController.getMyClientPlans: ${error}`);
            return res.status(501).json({ success: false, message: 'Error al obtener los planes de nutrición' });
        }
    },

    async createPlan(req, res) {
        try {
            const id_company = req.user.mi_store;
            if (!id_company) return res.status(403).json({ success: false, message: 'Tu cuenta no tiene una empresa asignada.' });
            const body = req.body.plan || req.body;
            if (!(await ownsClient(body.id_client, id_company))) {
                return res.status(403).json({ success: false, message: 'Ese cliente no es tuyo.' });
            }
            const created = await NutritionPlan.create({ ...body, id_company });
            if (created.active) await applyActivePlanEffects(created);
            return res.status(201).json({ success: true, message: 'Plan de nutrición creado.', data: created });
        } catch (error) {
            console.log(`Error en nutritionPlanController.createPlan: ${error}`);
            return res.status(501).json({ success: false, message: 'Error al crear el plan de nutrición' });
        }
    },

    async updatePlan(req, res) {
        try {
            const id_company = req.user.mi_store;
            const body = req.body.plan || req.body;
            if (!(await ownsPlan(body.id, id_company))) {
                return res.status(403).json({ success: false, message: 'Ese plan no es tuyo.' });
            }
            const updated = await NutritionPlan.update(body.id, body);
            if (updated.active) await applyActivePlanEffects(updated);
            return res.status(200).json({ success: true, message: 'Plan de nutrición actualizado.', data: updated });
        } catch (error) {
            console.log(`Error en nutritionPlanController.updatePlan: ${error}`);
            return res.status(501).json({ success: false, message: 'Error al actualizar el plan de nutrición' });
        }
    },

    async deletePlan(req, res) {
        try {
            const id_company = req.user.mi_store;
            const id = req.params.id;
            if (!(await ownsPlan(id, id_company))) {
                return res.status(403).json({ success: false, message: 'Ese plan no es tuyo.' });
            }
            await NutritionPlan.remove(id);
            return res.status(200).json({ success: true, message: 'Plan de nutrición eliminado.' });
        } catch (error) {
            console.log(`Error en nutritionPlanController.deletePlan: ${error}`);
            return res.status(501).json({ success: false, message: 'Error al eliminar el plan de nutrición' });
        }
    }
};
