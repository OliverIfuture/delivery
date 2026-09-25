// controllers/myRoutinesController.js
//
// NUEVO — wrapper real y seguro sobre el sistema de rutinas/plantillas que
// YA EXISTE (routines.is_template, ver models/routine.js /
// controllers/routinesController.js). Motivos para no reutilizar esas
// rutas directo desde "Plantillas" (Vue):
//   - findByTrainer/:id_company y getTemplates/:id_company confían en el
//     id_company de la URL sin validarlo contra el JWT (mismo hueco ya
//     cerrado antes para /users/myClients, /exercises/mine, etc.).
//   - update/:id y delete/:id NO validan que la rutina sea de la empresa
//     del que llama — cualquier cuenta autenticada podía sobreescribir o
//     borrar la rutina de OTRO entrenador solo adivinando/probando ids.
//   - No existe ningún endpoint para "aplicar una plantilla a un cliente"
//     ni para organizar plantillas en carpetas (routine_folders, nuevo).
// create() y setActive() del controller viejo SÍ son seguros (ya fuerzan
// id_company/verifican id_client) — se siguen usando tal cual, sin
// duplicarlos aquí.
const db = require('../config/config.js');
const Routine = require('../models/routine.js');
const RoutineFolder = require('../models/routineFolder.js');

async function ownsRoutine(id_routine, id_company) {
    const row = await db.oneOrNone('SELECT id_company FROM routines WHERE id = $1', [id_routine]);
    return !!row && Number(row.id_company) === Number(id_company);
}

async function ownsClient(id_client, id_company) {
    const row = await db.oneOrNone('SELECT id_entrenador FROM users WHERE id = $1', [id_client]);
    return !!row && Number(row.id_entrenador) === Number(id_company);
}

async function ownsFolder(id_folder, id_company) {
    const row = await RoutineFolder.findById(id_folder);
    return !!row && Number(row.id_company) === Number(id_company);
}

module.exports = {

    // ===================== Rutinas =====================

    async getMyTemplates(req, res) {
        try {
            const id_company = req.user.mi_store;
            if (!id_company) return res.status(403).json({ success: false, message: 'Tu cuenta no tiene una empresa asignada.' });
            const rows = await Routine.getTemplates(id_company);
            const folderByRoutine = await db.manyOrNone('SELECT id, folder_id FROM routines WHERE id_company = $1 AND is_template = true', [id_company]);
            const folderMap = new Map(folderByRoutine.map(r => [r.id, r.folder_id]));
            const data = rows.map(r => ({ ...r, folder_id: folderMap.get(r.id) ?? null }));
            return res.status(200).json({ success: true, data });
        } catch (error) {
            console.log(`Error en myRoutinesController.getMyTemplates: ${error}`);
            return res.status(501).json({ success: false, message: 'Error al obtener tus plantillas' });
        }
    },

    async getClientRoutines(req, res) {
        try {
            const id_company = req.user.mi_store;
            const id_client = req.params.id_client;
            if (!(await ownsClient(id_client, id_company))) {
                return res.status(403).json({ success: false, message: 'Ese cliente no es tuyo.' });
            }
            const rows = await db.manyOrNone(
                `SELECT id, id_company, id_client, name, description, image, is_active, is_template,
                        rest_time, current_week, plan_data, created_at, updated_at
                 FROM routines WHERE id_client = $1 AND id_company = $2 ORDER BY updated_at DESC`,
                [id_client, id_company]
            );
            return res.status(200).json({ success: true, data: rows });
        } catch (error) {
            console.log(`Error en myRoutinesController.getClientRoutines: ${error}`);
            return res.status(501).json({ success: false, message: 'Error al obtener las rutinas del cliente' });
        }
    },

    async updateMyRoutine(req, res) {
        try {
            const id_company = req.user.mi_store;
            const routine = req.body;
            if (!(await ownsRoutine(routine.id, id_company))) {
                return res.status(403).json({ success: false, message: 'Esa rutina no es tuya.' });
            }
            // Si además se está moviendo/asignando a un cliente nuevo, ese
            // cliente también debe ser tuyo.
            if (routine.id_client && !(await ownsClient(routine.id_client, id_company))) {
                return res.status(403).json({ success: false, message: 'Ese cliente no es tuyo.' });
            }
            await Routine.update(routine);
            if (routine.folder_id !== undefined) {
                await db.none('UPDATE routines SET folder_id = $2 WHERE id = $1', [routine.id, routine.folder_id || null]);
            }
            return res.status(200).json({ success: true, message: 'Rutina actualizada.' });
        } catch (error) {
            console.log(`Error en myRoutinesController.updateMyRoutine: ${error}`);
            return res.status(501).json({ success: false, message: 'Error al actualizar la rutina' });
        }
    },

    async deleteMyRoutine(req, res) {
        try {
            const id_company = req.user.mi_store;
            const id = req.params.id;
            if (!(await ownsRoutine(id, id_company))) {
                return res.status(403).json({ success: false, message: 'Esa rutina no es tuya.' });
            }
            await Routine.delete(id);
            return res.status(200).json({ success: true, message: 'Rutina eliminada.' });
        } catch (error) {
            console.log(`Error en myRoutinesController.deleteMyRoutine: ${error}`);
            return res.status(501).json({ success: false, message: 'Error al eliminar la rutina' });
        }
    },

    // Crea una copia real de una plantilla propia y la asigna a un cliente
    // propio — no existía ningún endpoint para esto (antes solo "clonar" un
    // system_routines global, un catálogo completamente distinto).
    async applyTemplateToClient(req, res) {
        try {
            const id_company = req.user.mi_store;
            const { id_template, id_client, make_active } = req.body;
            if (!(await ownsRoutine(id_template, id_company))) {
                return res.status(403).json({ success: false, message: 'Esa plantilla no es tuya.' });
            }
            if (!(await ownsClient(id_client, id_company))) {
                return res.status(403).json({ success: false, message: 'Ese cliente no es tuyo.' });
            }
            const template = await db.one('SELECT * FROM routines WHERE id = $1', [id_template]);
            const created = await Routine.create({
                id_company,
                id_client,
                name: template.name,
                plan_data: template.plan_data,
                description: template.description,
                rest_time: template.rest_time,
                image: template.image,
                is_template: false,
                current_week: 1,
                is_active: !!make_active
            });
            return res.status(201).json({ success: true, data: { id: created.id } });
        } catch (error) {
            console.log(`Error en myRoutinesController.applyTemplateToClient: ${error}`);
            return res.status(501).json({ success: false, message: 'Error al aplicar la plantilla' });
        }
    },

    // ===================== Carpetas =====================

    async getMyFolders(req, res) {
        try {
            const id_company = req.user.mi_store;
            if (!id_company) return res.status(403).json({ success: false, message: 'Tu cuenta no tiene una empresa asignada.' });
            const folders = await RoutineFolder.findByCompany(id_company);
            return res.status(200).json({ success: true, data: folders });
        } catch (error) {
            console.log(`Error en myRoutinesController.getMyFolders: ${error}`);
            return res.status(501).json({ success: false, message: 'Error al obtener tus carpetas' });
        }
    },

    async createMyFolder(req, res) {
        try {
            const id_company = req.user.mi_store;
            const { name, parent_id } = req.body;
            if (parent_id && !(await ownsFolder(parent_id, id_company))) {
                return res.status(403).json({ success: false, message: 'Esa carpeta no es tuya.' });
            }
            const created = await RoutineFolder.create(id_company, name || 'Nueva carpeta', parent_id);
            return res.status(201).json({ success: true, data: { id: created.id } });
        } catch (error) {
            console.log(`Error en myRoutinesController.createMyFolder: ${error}`);
            return res.status(501).json({ success: false, message: 'Error al crear la carpeta' });
        }
    },

    async renameMyFolder(req, res) {
        try {
            const id_company = req.user.mi_store;
            const { id, name } = req.body;
            if (!(await ownsFolder(id, id_company))) {
                return res.status(403).json({ success: false, message: 'Esa carpeta no es tuya.' });
            }
            await RoutineFolder.rename(id, name);
            return res.status(200).json({ success: true, message: 'Carpeta renombrada.' });
        } catch (error) {
            console.log(`Error en myRoutinesController.renameMyFolder: ${error}`);
            return res.status(501).json({ success: false, message: 'Error al renombrar la carpeta' });
        }
    },

    // Mueve una carpeta o una plantilla a otra carpeta (o a la raíz, con
    // target_folder_id null). `node_type` distingue cuál de las dos es.
    async moveMyNode(req, res) {
        try {
            const id_company = req.user.mi_store;
            const { node_id, node_type, target_folder_id } = req.body;

            if (target_folder_id && !(await ownsFolder(target_folder_id, id_company))) {
                return res.status(403).json({ success: false, message: 'Esa carpeta destino no es tuya.' });
            }

            if (node_type === 'folder') {
                if (!(await ownsFolder(node_id, id_company))) {
                    return res.status(403).json({ success: false, message: 'Esa carpeta no es tuya.' });
                }
                if (target_folder_id) {
                    const descendantIds = await RoutineFolder.findDescendantIds(node_id);
                    if (Number(node_id) === Number(target_folder_id) || descendantIds.map(Number).includes(Number(target_folder_id))) {
                        return res.status(400).json({ success: false, message: 'No puedes mover una carpeta dentro de sí misma.' });
                    }
                }
                await RoutineFolder.move(node_id, target_folder_id);
            } else {
                if (!(await ownsRoutine(node_id, id_company))) {
                    return res.status(403).json({ success: false, message: 'Esa plantilla no es tuya.' });
                }
                await db.none('UPDATE routines SET folder_id = $2 WHERE id = $1', [node_id, target_folder_id || null]);
            }

            return res.status(200).json({ success: true, message: 'Movido correctamente.' });
        } catch (error) {
            console.log(`Error en myRoutinesController.moveMyNode: ${error}`);
            return res.status(501).json({ success: false, message: 'Error al mover' });
        }
    },

    // Borra la carpeta — sus plantillas NO se pierden, quedan sueltas en la
    // raíz (folder_id -> NULL vía ON DELETE SET NULL); sus subcarpetas sí
    // se borran en cascada (ON DELETE CASCADE en routine_folders.parent_id).
    async deleteMyFolder(req, res) {
        try {
            const id_company = req.user.mi_store;
            const id = req.params.id;
            if (!(await ownsFolder(id, id_company))) {
                return res.status(403).json({ success: false, message: 'Esa carpeta no es tuya.' });
            }
            await RoutineFolder.delete(id);
            return res.status(200).json({ success: true, message: 'Carpeta eliminada.' });
        } catch (error) {
            console.log(`Error en myRoutinesController.deleteMyFolder: ${error}`);
            return res.status(501).json({ success: false, message: 'Error al eliminar la carpeta' });
        }
    }

};
