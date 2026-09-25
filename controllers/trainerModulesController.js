// controllers/trainerModulesController.js
//
// NUEVO — wrapper real y seguro sobre "Classroom" (módulos y lecciones),
// el sistema que YA EXISTE y está en producción para trainerapp (Flutter,
// ver models/product.js + controllers/productsControllers.js:
// getModules/:idCompany, createModule, createLesson, updateLesson,
// deleteModule, deleteLesson — tablas classroom_modules/classroom_lessons).
// Ese sistema confía en el id_company que manda el propio cliente (por URL
// o dentro del JSON del body) sin validarlo contra el JWT — mismo tipo de
// hueco que ya se cerró antes para clientes (getClientsByCompany ->
// /users/myClients). Aquí se deriva SIEMPRE de req.user.mi_store y se
// valida dueño antes de editar/borrar, reutilizando las funciones de
// modelo reales (Product.*) tal cual — no se toca ninguna función
// existente de productsControllers.js/product.js.
const Product = require('../models/product.js');
const storage = require('../utils/cloud_storage.js');
const db = require('../config/config.js');

async function ownsModule(id_module, id_company) {
    const row = await db.oneOrNone('SELECT id_company FROM classroom_modules WHERE id = $1', [id_module]);
    return !!row && Number(row.id_company) === Number(id_company);
}

async function ownsLesson(id_lesson, id_company) {
    const row = await db.oneOrNone(`
        SELECT m.id_company FROM classroom_lessons l
        INNER JOIN classroom_modules m ON m.id = l.module_id
        WHERE l.id = $1
    `, [id_lesson]);
    return !!row && Number(row.id_company) === Number(id_company);
}

module.exports = {

    async getMyModules(req, res) {
        try {
            const id_company = req.user.mi_store;
            if (!id_company) {
                return res.status(403).json({ success: false, message: 'Tu cuenta no tiene una empresa asignada.' });
            }
            const modules = await Product.getModulesByCompany(id_company);
            return res.status(200).json({ success: true, data: modules });
        } catch (error) {
            console.log(`Error en trainerModulesController.getMyModules: ${error}`);
            return res.status(501).json({ success: false, message: 'Error al obtener tus módulos' });
        }
    },

    async createMyModule(req, res) {
        try {
            const id_company = req.user.mi_store;
            if (!id_company) {
                return res.status(403).json({ success: false, message: 'Tu cuenta no tiene una empresa asignada.' });
            }

            const moduleData = JSON.parse(req.body.module || '{}');
            moduleData.id_company = id_company; // nunca confiar en lo que mande el cliente
            moduleData.is_active = moduleData.is_active !== false;
            moduleData.required_level = moduleData.required_level || 0;

            const created = await Product.createModule(moduleData);

            const files = req.files;
            if (files && files.length) {
                const url = await storage(files[0], `classroom_covers/company_${id_company}_${Date.now()}`);
                if (url) await Product.updateModuleImage(created.id, url);
            }

            return res.status(201).json({ success: true, data: { id: created.id } });
        } catch (error) {
            console.log(`Error en trainerModulesController.createMyModule: ${error}`);
            return res.status(501).json({ success: false, message: 'Error al crear el módulo' });
        }
    },

    async updateMyModule(req, res) {
        try {
            const id_company = req.user.mi_store;
            const moduleData = JSON.parse(req.body.module || '{}');
            const owns = await ownsModule(moduleData.id, id_company);
            if (!owns) {
                return res.status(403).json({ success: false, message: 'Ese módulo no es tuyo.' });
            }

            await Product.updateModuleText(moduleData);

            const files = req.files;
            if (files && files.length) {
                const url = await storage(files[0], `classroom_covers/company_${id_company}_${Date.now()}`);
                if (url) await Product.updateModuleImage(moduleData.id, url);
            }

            return res.status(200).json({ success: true, message: 'Módulo actualizado' });
        } catch (error) {
            console.log(`Error en trainerModulesController.updateMyModule: ${error}`);
            return res.status(501).json({ success: false, message: 'Error al actualizar el módulo' });
        }
    },

    async deleteMyModule(req, res) {
        try {
            const id_company = req.user.mi_store;
            const id = req.params.id;
            const owns = await ownsModule(id, id_company);
            if (!owns) {
                return res.status(403).json({ success: false, message: 'Ese módulo no es tuyo.' });
            }
            await Product.deleteModule(id);
            return res.status(200).json({ success: true, message: 'Módulo eliminado' });
        } catch (error) {
            console.log(`Error en trainerModulesController.deleteMyModule: ${error}`);
            return res.status(501).json({ success: false, message: 'Error al eliminar el módulo' });
        }
    },

    async createMyLesson(req, res) {
        try {
            const id_company = req.user.mi_store;
            const lessonData = JSON.parse(req.body.lesson || '{}');
            const owns = await ownsModule(lessonData.module_id, id_company);
            if (!owns) {
                return res.status(403).json({ success: false, message: 'Ese módulo no es tuyo.' });
            }

            const created = await Product.createLesson(lessonData);
            const files = req.files;
            if (files && files.length) {
                const url = await storage(files[0], `classroom_videos/lesson_${created.id}_${Date.now()}`);
                if (url) await Product.updateLessonVideo(created.id, url);
            }
            return res.status(201).json({ success: true, data: { id: created.id } });
        } catch (error) {
            console.log(`Error en trainerModulesController.createMyLesson: ${error}`);
            return res.status(501).json({ success: false, message: 'Error al crear la lección' });
        }
    },

    async updateMyLesson(req, res) {
        try {
            const id_company = req.user.mi_store;
            const lessonData = JSON.parse(req.body.lesson || '{}');
            const owns = await ownsLesson(lessonData.id, id_company);
            if (!owns) {
                return res.status(403).json({ success: false, message: 'Esa lección no es tuya.' });
            }

            const files = req.files;
            if (files && files.length) {
                const url = await storage(files[0], `classroom_videos/lesson_${lessonData.id}_${Date.now()}`);
                await Product.updateLessonFull(lessonData, url);
            } else {
                await Product.updateLessonText(lessonData);
            }
            return res.status(200).json({ success: true, message: 'Lección actualizada' });
        } catch (error) {
            console.log(`Error en trainerModulesController.updateMyLesson: ${error}`);
            return res.status(501).json({ success: false, message: 'Error al actualizar la lección' });
        }
    },

    async deleteMyLesson(req, res) {
        try {
            const id_company = req.user.mi_store;
            const id = req.params.id;
            const owns = await ownsLesson(id, id_company);
            if (!owns) {
                return res.status(403).json({ success: false, message: 'Esa lección no es tuya.' });
            }
            await Product.deleteLesson(id);
            return res.status(200).json({ success: true, message: 'Lección eliminada' });
        } catch (error) {
            console.log(`Error en trainerModulesController.deleteMyLesson: ${error}`);
            return res.status(501).json({ success: false, message: 'Error al eliminar la lección' });
        }
    }

};
