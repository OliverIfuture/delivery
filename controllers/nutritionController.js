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

          async analyzeMealAI(req, res, next) {
        try {
            const file = req.file; // La foto del plato
            const { weight, description } = req.body; // "400g", "50% carne, 50% arroz"

            if (!file) {
                return res.status(400).json({ success: false, message: 'Falta la foto del plato.' });
            }

            console.log(`[AI Meal] Analizando plato. Peso: ${weight}, Desc: ${description}`);

            const base64Data = file.buffer.toString("base64");

            // Prompt para Gemini Vision
            const promptText = `
                Actúa como un nutricionista experto. Analiza la imagen de este plato de comida.
                
                Datos del usuario:
                - Peso aproximado total del plato: ${weight}
                - Descripción/Distribución visual según usuario: ${description}

                Tareas:
                1. Identifica los alimentos en la foto.
                2. Calcula las calorías y macros (Proteína, Carbos, Grasas) estimados basándote en el peso visual y los datos proporcionados.
                3. Genera un nombre corto para el plato.

                IMPORTANTE: Responde SOLO con un JSON válido (sin markdown):
                {
                    "product_name": "Nombre del plato (ej. Pollo asado con verduras)",
                    "calories": 0,  // Numerico (kcal totales)
                    "proteins": 0,  // Numerico (gramos totales)
                    "carbs": 0,     // Numerico (gramos totales)
                    "fats": 0,      // Numerico (gramos totales)
                    "portion_size": ${parseFloat(weight) || 0}
                }
            `;

            const response = await aiClient.models.generateContent({
                model: 'gemini-1.5-flash-001', // Modelo Multimodal rápido
                contents: [
                    {
                        parts: [
                            { text: promptText },
                            { inlineData: { mimeType: 'image/jpeg', data: base64Data } }
                        ]
                    }
                ]
            });

            // Extraer y limpiar JSON
            let text = response.text();
            if (!text) throw new Error("IA sin respuesta");
            
            text = text.replace(/```json/g, '').replace(/```/g, '').trim();
            const analysis = JSON.parse(text);

            return res.status(200).json({
                success: true,
                data: analysis
            });

        } catch (error) {
            console.error("Error AI Meal:", error);
            return res.status(501).json({ success: false, message: 'Error al analizar el plato', error: error.message });
        }
    },
};
