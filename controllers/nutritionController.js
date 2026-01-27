const NutritionLog = require('../models/nutritionLog');
const NutritionGoals = require('../models/nutritionGoals');
const db = require('../config/config');

// --- 1. CONFIGURACIÓN DE IA (LIBRERÍA ESTABLE) ---
// Usamos @google/generative-ai porque es la que soporta BLOCK_NONE correctamente
const { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } = require("@google/generative-ai");
const aiClient = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
// ------------------------
module.exports = {

    async logFood(req, res, next) {
        try {
            const logData = req.body;
            logData.id_client = req.user.id;

            if (!logData.product_name || logData.calories === undefined || logData.calories === null) {
                return res.status(400).json({ success: false, message: 'Datos incompletos: Faltan calorías o nombre.' });
            }

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
            return res.status(501).json({ success: false, error: error });
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
            await db.none('DELETE FROM client_nutrition_log WHERE id = $1', [id]);
            return res.status(200).json({ success: true, message: 'Registro eliminado' });
        } catch (error) {
            console.error(error);
            return res.status(501).json({ success: false, message: 'Error al eliminar', error: error });
        }
    },

    // --- FUNCIÓN ACTUALIZADA CON @google/genai ---
    // --- FUNCIÓN ANALYZE MEAL AI (CORREGIDA MIME TYPE) ---
    async analyzeMealAI(req, res, next) {
        try {
            console.log('🚀 [START] analyzeMealAI request received');

            const file = req.file;
            const { weight, description } = req.body;

            if (!file) {
                return res.status(400).json({ success: false, message: 'Falta la foto del plato.' });
            }

            // 1. CORRECCIÓN DE MIME TYPE
            let mimeTypeToSend = file.mimetype;
            if (mimeTypeToSend === 'application/octet-stream') {
                mimeTypeToSend = 'image/jpeg';
            }

            // 2. PREPARAR MODELO CON SEGURIDAD DESACTIVADA
            // Usamos gemini-1.5-flash porque es el estándar actual (2.5 a veces no existe en todas las regiones)
            const model = aiClient.getGenerativeModel({
                model: "gemini-2.5-pro",
                safetySettings: [
                    { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
                    { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
                    { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
                    { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
                ]
            });

            // 3. PROMPT EXACTO PARA JSON
            const promptText = `
                ACTÚA COMO UN NUTRICIONISTA EXPERTO DE APPS DE FITNESS.
                Analiza la imagen de este plato.
                
                CONTEXTO:
                - Peso total aprox: ${weight} gramos
                - Descripción usuario: ${description}

                TAREA:
                1. Identifica los alimentos visualmente.
                2. Calcula macros aproximados para el peso dado.
                
                SALIDA (JSON ESTRICTO, SIN TEXTO ADICIONAL):
                {
                    "product_name": "Nombre corto del plato",
                    "calories": 0, 
                    "proteins": 0, 
                    "carbs": 0, 
                    "fats": 0, 
                    "portion_size": ${parseFloat(weight) || 0}
                }
            `;

            // 4. GENERAR CONTENIDO (Sintaxis Estable)
            const result = await model.generateContent([
                promptText,
                {
                    inlineData: {
                        mimeType: mimeTypeToSend,
                        data: file.buffer.toString("base64")
                    }
                }
            ]);

            const response = await result.response;
            let text = response.text();

            console.log('🤖 [IA] Respuesta cruda:', text);

            if (!text) throw new Error("IA sin respuesta de texto");

            // 5. LIMPIEZA JSON
            text = text.replace(/```json/g, '').replace(/```/g, '').trim();

            let analysis;
            try {
                analysis = JSON.parse(text);
            } catch (e) {
                console.error("Error parseando JSON de IA:", text);
                throw new Error("La IA no devolvió un JSON válido.");
            }

            console.log('✅ [SUCCESS] JSON procesado:', analysis);

            return res.status(200).json({
                success: true,
                data: analysis
            });

        } catch (error) {
            console.error("❌ [ERROR] analyzeMealAI:", error);
            return res.status(501).json({ success: false, message: 'Error al analizar el plato', error: error.message });
        }
    },

    async getWeeklyHistory(req, res, next) {
        try {
            const id_client = req.params.id_client;

            // Llamamos al modelo
            const data = await NutritionLog.getWeeklyHistory(id_client);

            // Retornamos la data tal cual (es una lista)
            return res.status(200).json({
                success: true,
                data: data
            });

        } catch (error) {
            console.error('Error en getWeeklyHistory:', error);
            return res.status(501).json({
                success: false,
                message: 'Error al obtener historial',
                error: error
            });
        }
    },
};
