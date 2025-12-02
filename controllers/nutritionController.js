const NutritionLog = require('../models/nutritionLog');
const NutritionGoals = require('../models/nutritionGoals'); // <-- IMPORTANTE

module.exports = {

async logFood(req, res, next) {
        try {
            const logData = req.body;
            logData.id_client = req.user.id; 
            
            // --- CORRECCIÓN DE VALIDACIÓN ---
            // Verificamos explícitamente que no sea undefined o null.
            // Así, si calories es 0, pasará la validación correctamente.
            if (!logData.product_name || logData.calories === undefined || logData.calories === null) {
                 return res.status(400).json({success: false, message: 'Datos incompletos: Faltan calorías o nombre.'});
            }
            // -------------------------------

            const data = await NutritionLog.create(logData);

            return res.status(201).json({
                success: true,
                message: 'Alimento registrado correctamente',
                data: data
            });
        } catch (error) {
            console.log(`Error: ${error}`);
            return res.status(501).json({
                success: false,
                message: 'Error al registrar alimento',
                error: error.message || error
            });
        }
    },

    
    async getDailyLog(req, res, next) {
        try {
            const id_client = req.params.id_client;
            const data = await NutritionLog.findByClientToday(id_client);
            return res.status(200).json(data);
        } catch (error) {
            console.log(`Error: ${error}`);
            return res.status(501).json({success: false, error: error});
        }
    },

            async setGoals(req, res, next) {
        try {
            const goals = req.body;
            goals.id_client = req.user.id;
            const data = await NutritionGoals.setGoals(goals);
            return res.status(201).json({ success: true, message: 'Metas actualizadas', data: data });
        } catch (error) {
            console.error(error);
            return res.status(501).json({ success: false, message: 'Error al guardar metas', error: error });
        }
    },

    async getGoals(req, res, next) {
        try {
            const id_client = req.params.id_client;
            const data = await NutritionGoals.findByClient(id_client);
            // Si no tiene metas, devolvemos un default
            const defaultGoals = { calories: 2000, proteins: 150, carbs: 200, fats: 60 };
            return res.status(200).json({ success: true, data: data || defaultGoals });
        } catch (error) {
            console.error(error);
            return res.status(501).json({ success: false, message: 'Error al obtener metas', error: error });
        }
    },

    async deleteLog(req, res, next) {
        try {
            const id = req.params.id;
            // Borrado directo simple
            await db.none('DELETE FROM client_nutrition_log WHERE id = $1', [id]);
            return res.status(200).json({ success: true, message: 'Registro eliminado' });
        } catch (error) {
            console.error(error);
            return res.status(501).json({ success: false, message: 'Error al eliminar', error: error });
        }
    },
};
