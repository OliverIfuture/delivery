// controllers/nutritionCatalogController.js
//
// NUEVO — CRUD real y seguro para el catálogo de nutrición del entrenador:
// ingredientes (master_ingredients, antes sin ningún camino de escritura),
// recetas (diet_recipes_v2 — ya tenía creación, pero insegura y sin
// editar/borrar) y suplementos (supplements_v2, tabla nueva — antes no
// existía nada de suplementos en el backend). Todo id_company sale del
// JWT, nunca del cliente. No se toca ningún endpoint/función existente:
// /api/diets/createWithImage sigue ahí tal cual, simplemente el frontend
// real deja de usarlo.
const MasterIngredient = require('../models/masterIngredient.js');
const Supplement = require('../models/supplement.js');
const Diet = require('../models/diet.js');
const storage = require('../utils/cloud_storage.js');

function numOrZero(v) { const n = Number(v); return Number.isFinite(n) ? n : 0; }

async function ownsIngredient(id, id_company) {
    const row = await MasterIngredient.findById(id);
    return !!row && row.id_company != null && Number(row.id_company) === Number(id_company);
}
async function ownsRecipe(id, id_company) {
    const row = await Diet.findRecipeByIdV2(id);
    return !!row && row.id_company != null && Number(row.id_company) === Number(id_company);
}
async function ownsSupplement(id, id_company) {
    const row = await Supplement.findById(id);
    return !!row && row.id_company != null && Number(row.id_company) === Number(id_company);
}

module.exports = {

    // ===================== Ingredientes =====================
    async getMyIngredients(req, res) {
        try {
            const id_company = req.user.mi_store;
            if (!id_company) return res.status(403).json({ success: false, message: 'Tu cuenta no tiene una empresa asignada.' });
            const rows = await Diet.findByCompanyMasetr(id_company);
            return res.status(200).json({ success: true, data: rows });
        } catch (error) {
            console.log(`Error en nutritionCatalogController.getMyIngredients: ${error}`);
            return res.status(501).json({ success: false, message: 'Error al obtener tus ingredientes' });
        }
    },

    async createMyIngredient(req, res) {
        try {
            const id_company = req.user.mi_store;
            if (!id_company) return res.status(403).json({ success: false, message: 'Tu cuenta no tiene una empresa asignada.' });
            const body = JSON.parse(req.body.ingredient || '{}');
            if (!body.name) return res.status(400).json({ success: false, message: 'Falta el nombre del ingrediente.' });

            let image_url = null;
            const files = req.files;
            if (files && files.length) {
                image_url = await storage(files[0], `master_ingredients/company_${id_company}_${Date.now()}`);
            }

            const created = await MasterIngredient.create({
                id_company,
                name: body.name,
                unit: body.unit,
                base_qty: numOrZero(body.base_qty) || 100,
                calories: numOrZero(body.calories),
                protein: numOrZero(body.protein),
                carbs: numOrZero(body.carbs),
                fats: numOrZero(body.fats),
                category: body.category,
                image_url,
                brand: body.brand
            });
            return res.status(201).json({ success: true, data: created });
        } catch (error) {
            console.log(`Error en nutritionCatalogController.createMyIngredient: ${error}`);
            return res.status(501).json({ success: false, message: 'Error al crear el ingrediente' });
        }
    },

    async updateMyIngredient(req, res) {
        try {
            const id_company = req.user.mi_store;
            const body = JSON.parse(req.body.ingredient || '{}');
            if (!body.id) return res.status(400).json({ success: false, message: 'Falta el id del ingrediente.' });
            if (!(await ownsIngredient(body.id, id_company))) {
                return res.status(403).json({ success: false, message: 'Ese ingrediente no es tuyo.' });
            }

            let image_url = body.image_url || null;
            const files = req.files;
            if (files && files.length) {
                image_url = await storage(files[0], `master_ingredients/company_${id_company}_${Date.now()}`);
            }

            await MasterIngredient.update(body.id, {
                name: body.name,
                unit: body.unit,
                base_qty: numOrZero(body.base_qty) || 100,
                calories: numOrZero(body.calories),
                protein: numOrZero(body.protein),
                carbs: numOrZero(body.carbs),
                fats: numOrZero(body.fats),
                category: body.category,
                image_url,
                brand: body.brand
            });
            return res.status(200).json({ success: true, message: 'Ingrediente actualizado.' });
        } catch (error) {
            console.log(`Error en nutritionCatalogController.updateMyIngredient: ${error}`);
            return res.status(501).json({ success: false, message: 'Error al actualizar el ingrediente' });
        }
    },

    async deleteMyIngredient(req, res) {
        try {
            const id_company = req.user.mi_store;
            const id = req.params.id;
            if (!(await ownsIngredient(id, id_company))) {
                return res.status(403).json({ success: false, message: 'Ese ingrediente no es tuyo.' });
            }
            const usages = await MasterIngredient.countRecipeUsages(id);
            if (usages > 0) {
                return res.status(409).json({
                    success: false,
                    message: `No puedes eliminar este ingrediente — lo usan ${usages} receta${usages === 1 ? '' : 's'}. Quítalo de esas recetas primero.`
                });
            }
            await MasterIngredient.delete(id);
            return res.status(200).json({ success: true, message: 'Ingrediente eliminado.' });
        } catch (error) {
            console.log(`Error en nutritionCatalogController.deleteMyIngredient: ${error}`);
            return res.status(501).json({ success: false, message: 'Error al eliminar el ingrediente' });
        }
    },

    // ===================== Recetas =====================
    async getMyRecipes(req, res) {
        try {
            const id_company = req.user.mi_store;
            if (!id_company) return res.status(403).json({ success: false, message: 'Tu cuenta no tiene una empresa asignada.' });
            const rows = await Diet.findRecipesByCompanyV2(id_company);
            return res.status(200).json({ success: true, data: rows });
        } catch (error) {
            console.log(`Error en nutritionCatalogController.getMyRecipes: ${error}`);
            return res.status(501).json({ success: false, message: 'Error al obtener tus recetas' });
        }
    },

    async createMyRecipe(req, res) {
        try {
            const id_company = req.user.mi_store;
            if (!id_company) return res.status(403).json({ success: false, message: 'Tu cuenta no tiene una empresa asignada.' });
            const recipe = JSON.parse(req.body.recipe || '{}');
            const ingredients = JSON.parse(req.body.ingredients_array || '[]');
            if (!recipe.title) return res.status(400).json({ success: false, message: 'Falta el título de la receta.' });

            let image_url = null;
            const files = req.files;
            if (files && files.length) {
                image_url = await storage(files[0], `diet_recipes/company_${id_company}_${Date.now()}`);
            }

            // OJO — Diet.createRecipe (existente, no se toca) regresa
            // directo el id numérico (res.id), no un objeto {id}.
            const createdId = await Diet.createRecipe({
                id_company,
                default_meal_category: recipe.default_meal_category || null,
                title: recipe.title,
                image_url,
                prep_time_minutes: recipe.prep_time_minutes || 0,
                preparation_steps: recipe.preparation_steps || [],
                total_calories: numOrZero(recipe.total_calories),
                total_protein: numOrZero(recipe.total_protein),
                total_carbs: numOrZero(recipe.total_carbs),
                total_fats: numOrZero(recipe.total_fats)
            });
            if (ingredients.length) {
                await Diet.insertIngredientsMap(createdId, ingredients);
            }
            return res.status(201).json({ success: true, data: { id: createdId } });
        } catch (error) {
            console.log(`Error en nutritionCatalogController.createMyRecipe: ${error}`);
            return res.status(501).json({ success: false, message: 'Error al crear la receta' });
        }
    },

    async updateMyRecipe(req, res) {
        try {
            const id_company = req.user.mi_store;
            const recipe = JSON.parse(req.body.recipe || '{}');
            const ingredients = JSON.parse(req.body.ingredients_array || '[]');
            if (!recipe.id) return res.status(400).json({ success: false, message: 'Falta el id de la receta.' });
            if (!(await ownsRecipe(recipe.id, id_company))) {
                return res.status(403).json({ success: false, message: 'Esa receta no es tuya.' });
            }

            let image_url = recipe.image_url || null;
            const files = req.files;
            if (files && files.length) {
                image_url = await storage(files[0], `diet_recipes/company_${id_company}_${Date.now()}`);
            }

            await Diet.updateRecipe(recipe.id, {
                default_meal_category: recipe.default_meal_category || null,
                title: recipe.title,
                image_url,
                prep_time_minutes: recipe.prep_time_minutes || 0,
                preparation_steps: recipe.preparation_steps || [],
                total_calories: numOrZero(recipe.total_calories),
                total_protein: numOrZero(recipe.total_protein),
                total_carbs: numOrZero(recipe.total_carbs),
                total_fats: numOrZero(recipe.total_fats)
            });
            // Reemplaza el mapa de ingredientes completo — más simple y
            // confiable que un diff, y coincide con cómo ya edita el
            // frontend real las asignaciones de dieta (borra y re-crea).
            await Diet.deleteIngredientsMap(recipe.id);
            if (ingredients.length) {
                await Diet.insertIngredientsMap(recipe.id, ingredients);
            }
            return res.status(200).json({ success: true, message: 'Receta actualizada.' });
        } catch (error) {
            console.log(`Error en nutritionCatalogController.updateMyRecipe: ${error}`);
            return res.status(501).json({ success: false, message: 'Error al actualizar la receta' });
        }
    },

    async deleteMyRecipe(req, res) {
        try {
            const id_company = req.user.mi_store;
            const id = req.params.id;
            if (!(await ownsRecipe(id, id_company))) {
                return res.status(403).json({ success: false, message: 'Esa receta no es tuya.' });
            }
            await Diet.deleteIngredientsMap(id);
            await Diet.deleteRecipe(id);
            return res.status(200).json({ success: true, message: 'Receta eliminada.' });
        } catch (error) {
            console.log(`Error en nutritionCatalogController.deleteMyRecipe: ${error}`);
            return res.status(501).json({ success: false, message: 'Error al eliminar la receta' });
        }
    },

    // ===================== Suplementos =====================
    async getMySupplements(req, res) {
        try {
            const id_company = req.user.mi_store;
            if (!id_company) return res.status(403).json({ success: false, message: 'Tu cuenta no tiene una empresa asignada.' });
            const rows = await Supplement.findByCompany(id_company);
            return res.status(200).json({ success: true, data: rows });
        } catch (error) {
            console.log(`Error en nutritionCatalogController.getMySupplements: ${error}`);
            return res.status(501).json({ success: false, message: 'Error al obtener tus suplementos' });
        }
    },

    async createMySupplement(req, res) {
        try {
            const id_company = req.user.mi_store;
            if (!id_company) return res.status(403).json({ success: false, message: 'Tu cuenta no tiene una empresa asignada.' });
            const body = JSON.parse(req.body.supplement || '{}');
            if (!body.name) return res.status(400).json({ success: false, message: 'Falta el nombre del suplemento.' });

            let image_url = null;
            const files = req.files;
            if (files && files.length) {
                image_url = await storage(files[0], `supplements/company_${id_company}_${Date.now()}`);
            }

            const created = await Supplement.create({ ...body, id_company, image_url: image_url || body.image_url || null });
            return res.status(201).json({ success: true, data: created });
        } catch (error) {
            console.log(`Error en nutritionCatalogController.createMySupplement: ${error}`);
            return res.status(501).json({ success: false, message: 'Error al crear el suplemento' });
        }
    },

    async updateMySupplement(req, res) {
        try {
            const id_company = req.user.mi_store;
            const body = JSON.parse(req.body.supplement || '{}');
            if (!body.id) return res.status(400).json({ success: false, message: 'Falta el id del suplemento.' });
            if (!(await ownsSupplement(body.id, id_company))) {
                return res.status(403).json({ success: false, message: 'Ese suplemento no es tuyo.' });
            }

            let image_url = body.image_url || null;
            const files = req.files;
            if (files && files.length) {
                image_url = await storage(files[0], `supplements/company_${id_company}_${Date.now()}`);
            }

            await Supplement.update(body.id, { ...body, image_url });
            return res.status(200).json({ success: true, message: 'Suplemento actualizado.' });
        } catch (error) {
            console.log(`Error en nutritionCatalogController.updateMySupplement: ${error}`);
            return res.status(501).json({ success: false, message: 'Error al actualizar el suplemento' });
        }
    },

    async deleteMySupplement(req, res) {
        try {
            const id_company = req.user.mi_store;
            const id = req.params.id;
            if (!(await ownsSupplement(id, id_company))) {
                return res.status(403).json({ success: false, message: 'Ese suplemento no es tuyo.' });
            }
            await Supplement.delete(id);
            return res.status(200).json({ success: true, message: 'Suplemento eliminado.' });
        } catch (error) {
            console.log(`Error en nutritionCatalogController.deleteMySupplement: ${error}`);
            return res.status(501).json({ success: false, message: 'Error al eliminar el suplemento' });
        }
    }

};
