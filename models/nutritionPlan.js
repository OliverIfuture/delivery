// models/nutritionPlan.js
//
// NUEVO — antes "Crear plan de nutrición" (macros/SMAE, NutritionPlanEditor.vue
// del frontend) no se guardaba en ningún lado: "Guardar" solo metía el
// objeto en un array en memoria del navegador (client.value.nutritionPlans
// en ClientDetailView.vue). Al recargar la página, o desde el celular del
// cliente, el plan desaparecía por completo — no había tabla ni endpoint.
// Esta tabla guarda la metadata completa del plan (para que el entrenador
// pueda volver a abrirlo/editarlo tal cual lo dejó). El EFECTO real sobre
// el cliente (lo que su app de verdad lee) sigue pasando por los mismos
// mecanismos ya reales y verificados: users.target_calories/protein/carbs/
// fats y client_diets_v2 — ver setActive() abajo y Diet.assignMultiple()
// (pre-existente, sin tocar) en el controller.
const db = require('../config/config.js');

const NutritionPlan = {};

const COLUMNS = `
    id, id_client, id_company, name, method, active, target_kcal,
    macro_percents, portions, meal_times, meal_portions, suggestions,
    notes, start_date, end_date, allow_exchange, locked_macros, supplements,
    created_at, updated_at
`;

NutritionPlan.create = (plan) => {
    return db.tx(async (t) => {
        if (plan.active) {
            await t.none('UPDATE nutrition_plans SET active = false, updated_at = now() WHERE id_client = $1 AND active = true', [plan.id_client]);
        }
        return t.one(`
            INSERT INTO nutrition_plans (
                id_client, id_company, name, method, active, target_kcal,
                macro_percents, portions, meal_times, meal_portions, suggestions,
                notes, start_date, end_date, allow_exchange, locked_macros, supplements
            ) VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8::jsonb, $9::jsonb, $10::jsonb, $11::jsonb, $12, $13, $14, $15, $16::jsonb, $17::jsonb)
            RETURNING ${COLUMNS}
        `, [
            plan.id_client, plan.id_company, plan.name || '', plan.method || 'equivalencias',
            !!plan.active, plan.target_kcal || 0,
            JSON.stringify(plan.macro_percents || {}), JSON.stringify(plan.portions || {}),
            JSON.stringify(plan.meal_times || []), JSON.stringify(plan.meal_portions || {}),
            JSON.stringify(plan.suggestions || {}), plan.notes || null,
            plan.start_date || null, plan.end_date || null,
            plan.allow_exchange ?? true, JSON.stringify(plan.locked_macros || {}), JSON.stringify(plan.supplements || [])
        ]);
    });
};

NutritionPlan.update = (id, plan) => {
    return db.tx(async (t) => {
        if (plan.active) {
            await t.none('UPDATE nutrition_plans SET active = false, updated_at = now() WHERE id_client = $1 AND active = true AND id != $2', [plan.id_client, id]);
        }
        return t.one(`
            UPDATE nutrition_plans SET
                name = $2, method = $3, active = $4, target_kcal = $5,
                macro_percents = $6::jsonb, portions = $7::jsonb, meal_times = $8::jsonb,
                meal_portions = $9::jsonb, suggestions = $10::jsonb, notes = $11,
                start_date = $12, end_date = $13, allow_exchange = $14,
                locked_macros = $15::jsonb, supplements = $16::jsonb, updated_at = now()
            WHERE id = $1
            RETURNING ${COLUMNS}
        `, [
            id, plan.name || '', plan.method || 'equivalencias', !!plan.active, plan.target_kcal || 0,
            JSON.stringify(plan.macro_percents || {}), JSON.stringify(plan.portions || {}),
            JSON.stringify(plan.meal_times || []), JSON.stringify(plan.meal_portions || {}),
            JSON.stringify(plan.suggestions || {}), plan.notes || null,
            plan.start_date || null, plan.end_date || null,
            plan.allow_exchange ?? true, JSON.stringify(plan.locked_macros || {}), JSON.stringify(plan.supplements || [])
        ]);
    });
};

NutritionPlan.findByClient = (id_client) => {
    return db.manyOrNone(`SELECT ${COLUMNS} FROM nutrition_plans WHERE id_client = $1 ORDER BY created_at DESC`, [id_client]);
};

NutritionPlan.findById = (id) => {
    return db.oneOrNone(`SELECT ${COLUMNS} FROM nutrition_plans WHERE id = $1`, [id]);
};

NutritionPlan.remove = (id) => {
    return db.none('DELETE FROM nutrition_plans WHERE id = $1', [id]);
};

module.exports = NutritionPlan;
