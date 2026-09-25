// models/supplement.js
//
// NUEVO — tabla `supplements_v2` (nueva, no existía nada para suplementos
// en todo el backend: se confirmó por grep que "supplement/suplemento"
// solo aparecía en cadenas de deeplinks de tiendas, sin ninguna tabla ni
// controller real). Antes los suplementos vivían mezclados dentro de
// master_ingredients (ids 9, 247-258, unit 'scoop'/'cápsula', sin dosis,
// formato, momento de toma ni ingredientes activos) — se dejan intactos
// ahí (siguen sirviendo como "ingrediente" dentro de una dieta), pero de
// aquí en adelante un suplemento nuevo se crea con su propia estructura
// real (dosis, formato, momento, frecuencia, activos, alérgenos,
// advertencias) en vez de forzarlo a la forma de un alimento.
const db = require('../config/config.js');

const Supplement = {};

const COLUMNS = `
    id, id_company, name, brand, category, format, image_url,
    portion_qty, portion_unit, portion_weight, provides_calories,
    calories, protein, carbs, fats, actives, timing, frequency,
    usage_notes, allergens, warnings, created_at, updated_at
`;

Supplement.findByCompany = (id_company) => {
    return db.manyOrNone(`
        SELECT ${COLUMNS} FROM supplements_v2
        WHERE id_company = $1 OR id_company IS NULL
        ORDER BY name ASC
    `, [id_company]);
};

Supplement.findById = (id) => {
    return db.oneOrNone(`SELECT ${COLUMNS} FROM supplements_v2 WHERE id = $1`, [id]);
};

Supplement.create = (s) => {
    return db.one(`
        INSERT INTO supplements_v2 (
            id_company, name, brand, category, format, image_url,
            portion_qty, portion_unit, portion_weight, provides_calories,
            calories, protein, carbs, fats, actives, timing, frequency,
            usage_notes, allergens, warnings
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15::jsonb,$16,$17,$18,$19::jsonb,$20::jsonb)
        RETURNING ${COLUMNS}
    `, [
        s.id_company, s.name, s.brand || null, s.category || null, s.format || null, s.image_url || null,
        s.portion_qty || null, s.portion_unit || null, s.portion_weight || null, !!s.provides_calories,
        s.calories ?? 0, s.protein ?? 0, s.carbs ?? 0, s.fats ?? 0,
        JSON.stringify(s.actives || []), s.timing || null, s.frequency || null,
        s.usage_notes || null, JSON.stringify(s.allergens || []), JSON.stringify(s.warnings || [])
    ]);
};

Supplement.update = (id, s) => {
    return db.none(`
        UPDATE supplements_v2 SET
            name = $2, brand = $3, category = $4, format = $5, image_url = $6,
            portion_qty = $7, portion_unit = $8, portion_weight = $9, provides_calories = $10,
            calories = $11, protein = $12, carbs = $13, fats = $14, actives = $15::jsonb,
            timing = $16, frequency = $17, usage_notes = $18, allergens = $19::jsonb, warnings = $20::jsonb,
            updated_at = now()
        WHERE id = $1
    `, [
        id, s.name, s.brand || null, s.category || null, s.format || null, s.image_url || null,
        s.portion_qty || null, s.portion_unit || null, s.portion_weight || null, !!s.provides_calories,
        s.calories ?? 0, s.protein ?? 0, s.carbs ?? 0, s.fats ?? 0,
        JSON.stringify(s.actives || []), s.timing || null, s.frequency || null,
        s.usage_notes || null, JSON.stringify(s.allergens || []), JSON.stringify(s.warnings || [])
    ]);
};

Supplement.delete = (id) => {
    return db.none('DELETE FROM supplements_v2 WHERE id = $1', [id]);
};

module.exports = Supplement;
