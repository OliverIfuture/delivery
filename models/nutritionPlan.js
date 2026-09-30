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

// ===================== Efecto real sobre client_diets_v2 =====================
// Reportado en vivo: al crear un plan nuevo para el mismo cliente, las
// recetas del plan VIEJO se quedaban asignadas para siempre — Diet.assign
// Multiple (pre-existente) nunca las limpia, y client_diets_v2 no tenía
// forma de saber a qué plan pertenecía cada fila. El entrenador veía la
// UNIÓN de las recetas de TODOS los planes que alguna vez tuvo el cliente
// en vez de solo las del plan vigente — muy confuso. id_nutrition_plan
// (columna nueva, aditiva) ahora marca de qué plan viene cada asignación.

// Mismo upsert que Diet.assignMultiple (mismo constraint real
// id_client+id_recipe+categoría), pero además guarda id_nutrition_plan —
// no se pudo reusar esa función porque su INSERT no incluye esa columna
// y es pre-existente (no se toca).
NutritionPlan.applyRecipeAssignments = (id_nutrition_plan, assignments) => {
    return db.tx('apply-nutrition-plan-assignments', async (t) => {
        const queries = assignments.map((a) => t.none(
            `INSERT INTO client_diets_v2 (
                id_client, id_recipe, assigned_meal_category, custom_ingredients,
                final_calories, final_protein, final_carbs, final_fats, notes,
                id_nutrition_plan, created_at
            ) VALUES ($1, $2, $3, $4::jsonb, $5, $6, $7, $8, $9, $10, $11)
            ON CONFLICT (id_client, id_recipe, assigned_meal_category)
            DO UPDATE SET
                custom_ingredients = EXCLUDED.custom_ingredients,
                final_calories = EXCLUDED.final_calories,
                final_protein = EXCLUDED.final_protein,
                final_carbs = EXCLUDED.final_carbs,
                final_fats = EXCLUDED.final_fats,
                notes = EXCLUDED.notes,
                id_nutrition_plan = EXCLUDED.id_nutrition_plan`,
            [
                a.id_client, a.id_recipe, a.assigned_meal_category,
                JSON.stringify(a.custom_ingredients || []),
                a.final_calories || 0, a.final_protein || 0, a.final_carbs || 0, a.final_fats || 0,
                a.notes || '', id_nutrition_plan, new Date()
            ]
        ));
        if (assignments.length) {
            const first = assignments[0];
            queries.push(t.none(
                'UPDATE users SET target_protein = $1, target_carbs = $2, target_fats = $3, target_calories = $4 WHERE id = $5',
                [first.target_protein || 0, first.target_carbs || 0, first.target_fats || 0, first.target_calories || 0, first.id_client]
            ));
        }
        return t.batch(queries);
    });
};

// Al activar un plan, las asignaciones de OTROS planes del mismo cliente
// (los que quedaron desactivados) dejan de ser vigentes — se borran para
// que el cliente ya no las vea mezcladas con las del plan actual.
// Asignaciones manuales sueltas (id_nutrition_plan IS NULL, ver
// assignRecipesToClient/saveRecipeEdit en el frontend) NUNCA se tocan
// aquí — solo pertenecen a otro plan de nutrición, no a ninguno.
NutritionPlan.clearOtherPlanAssignments = (id_client, keepPlanId) => {
    return db.none(
        'DELETE FROM client_diets_v2 WHERE id_client = $1 AND id_nutrition_plan IS NOT NULL AND id_nutrition_plan != $2',
        [id_client, keepPlanId]
    );
};

// Se usa al guardar un plan como borrador (ya no debe tener efecto real
// sobre el cliente) y al eliminarlo por completo.
NutritionPlan.clearAssignmentsForPlan = (id_nutrition_plan) => {
    return db.none('DELETE FROM client_diets_v2 WHERE id_nutrition_plan = $1', [id_nutrition_plan]);
};

module.exports = NutritionPlan;
