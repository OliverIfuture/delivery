// models/routineFolder.js
//
// NUEVO — carpetas para organizar las plantillas de rutina de un
// entrenador (routines.is_template = true). No existía ningún concepto de
// carpeta/categoría para rutinas en todo el backend (verificado) — tabla
// nueva `routine_folders` (con parent_id para anidar N niveles) más una
// columna nueva `routines.folder_id` (solo tiene sentido para plantillas;
// las rutinas de un cliente siempre quedan con folder_id NULL).
const db = require('../config/config.js');

const RoutineFolder = {};

RoutineFolder.findByCompany = (id_company) => {
    return db.manyOrNone(
        `SELECT id, parent_id, name FROM routine_folders WHERE id_company = $1 ORDER BY name ASC`,
        [id_company]
    );
};

RoutineFolder.create = (id_company, name, parent_id) => {
    return db.one(
        `INSERT INTO routine_folders(id_company, parent_id, name) VALUES ($1, $2, $3) RETURNING id`,
        [id_company, parent_id || null, name]
    );
};

RoutineFolder.rename = (id, name) => {
    return db.none(`UPDATE routine_folders SET name = $2, updated_at = NOW() WHERE id = $1`, [id, name]);
};

RoutineFolder.findById = (id) => {
    return db.oneOrNone(`SELECT id, id_company, parent_id, name FROM routine_folders WHERE id = $1`, [id]);
};

// Devuelve todos los ids descendientes de una carpeta (para validar que no
// se mueva/reasigne dentro de sí misma, y para el borrado en cascada de
// referencias en `routines.folder_id` — el FK ya hace CASCADE en la propia
// tabla routine_folders, pero routines.folder_id usa ON DELETE SET NULL,
// así que las plantillas de una carpeta borrada quedan sueltas en la raíz
// en vez de perderse).
RoutineFolder.findDescendantIds = async (id) => {
    const all = await db.manyOrNone(`SELECT id, parent_id FROM routine_folders`);
    const result = [];
    const stack = [id];
    while (stack.length) {
        const current = stack.pop();
        for (const row of all) {
            if (Number(row.parent_id) === Number(current)) {
                result.push(row.id);
                stack.push(row.id);
            }
        }
    }
    return result;
};

RoutineFolder.delete = (id) => {
    return db.none(`DELETE FROM routine_folders WHERE id = $1`, [id]);
};

RoutineFolder.move = (id, parent_id) => {
    return db.none(`UPDATE routine_folders SET parent_id = $2, updated_at = NOW() WHERE id = $1`, [id, parent_id || null]);
};

module.exports = RoutineFolder;
