const db = require('../config/config');

const NutritionGoals = {};

// Crear o Actualizar metas (Upsert)
NutritionGoals.setGoals = (goals) => {
    const sql = `
        INSERT INTO client_nutrition_goals(
            id_client, calories, proteins, carbs, fats, updated_at
        )
        VALUES($1, $2, $3, $4, $5, NOW())
        ON CONFLICT (id_client) 
        DO UPDATE SET 
            calories = EXCLUDED.calories,
            proteins = EXCLUDED.proteins,
            carbs = EXCLUDED.carbs,
            fats = EXCLUDED.fats,
            updated_at = NOW()
        RETURNING *
    `;
    return db.one(sql, [
        goals.id_client,
        goals.calories,
        goals.proteins,
        goals.carbs,
        goals.fats
    ]);
};

NutritionGoals.findByClient = (id_client) => {
    const sql = `
        SELECT * FROM client_nutrition_goals WHERE id_client = $1
    `;
    return db.oneOrNone(sql, [id_client]);
};

module.exports = NutritionGoals;
