const NutritionLog = require('../models/nutritionLog');

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
    }
};
