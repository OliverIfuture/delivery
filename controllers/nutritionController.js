const NutritionLog = require('../models/nutritionLog');
const NutritionGoals = require('../models/nutritionGoals');

// --- 1. IMPORTAR E INICIALIZAR GEMINI (ESTO FALTABA) ---
const { GoogleGenerativeAI } = require("@google/generative-ai");

// Asegúrate de que esta variable de entorno esté configurada en Heroku
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
// --------------------------------------------------------

module.exports = {

    async logFood(req, res, next) {
        try {
            const logData = req.body;
            logData.id_client = req.user.id; 
            
            if (!logData.product_name || logData.calories === undefined || logData.calories === null) {
                 return res.status(400).json({success: false, message: 'Datos incompletos: Faltan calorías o nombre.'});
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
            // Asegúrate de que 'db' esté importado o disponible en este contexto si usas pg-promise directo
            // Si NutritionLog tiene un método delete, úsalo mejor: await NutritionLog.delete(id);
            // Asumo que tienes db disponible globalmente o te faltó el require de la config de db arriba.
            // Por ahora lo dejo como lo tenías, pero ojo si 'db' no está definido.
            const db = require('../config/config'); // <--- AÑADIDO POR SEGURIDAD SI USAS DB DIRECTO
            await db.none('DELETE FROM client_nutrition_log WHERE id = $1', [id]);
            return res.status(200).json({ success: true, message: 'Registro eliminado' });
        } catch (error) {
            console.error(error);
            return res.status(501).json({ success: false, message: 'Error al eliminar', error: error });
        }
    },

    // --- FUNCIÓN CORREGIDA Y CON LOGS ---
    async analyzeMealAI(req, res, next) {
        try {
            // LOG 1: Inicio de la petición
            console.log('🚀 [START] analyzeMealAI request received');
            
            const file = req.file; 
            const { weight, description } = req.body; 

            // LOG 2: Verificar datos entrantes
            console.log('📦 Datos recibidos:', { 
                weight, 
                description, 
                fileRecibido: file ? 'Sí' : 'No',
                mimetype: file ? file.mimetype : 'N/A'
            });

            if (!file) {
                console.error('❌ Error: No hay archivo');
                return res.status(400).json({ success: false, message: 'Falta la foto del plato.' });
            }

            // Preparar imagen para Gemini
            const imagePart = {
                inlineData: {
                    data: file.buffer.toString("base64"),
                    mimeType: file.mimetype,
                },
            };

            const promptText = `
                Actúa como un nutricionista experto. Analiza la imagen de este plato de comida.
                Datos del usuario:
                - Peso aproximado total del plato: ${weight} gramos
                - Descripción: ${description}

                Tareas:
                1. Identifica los alimentos.
                2. Calcula calorías y macros estimados para ese peso.
                3. Genera un nombre corto.

                IMPORTANTE: Responde SOLO con un JSON válido (sin markdown, sin explicaciones):
                {
                    "product_name": "Nombre del plato",
                    "calories": 0, 
                    "proteins": 0, 
                    "carbs": 0, 
                    "fats": 0, 
                    "portion_size": ${parseFloat(weight) || 0}
                }
            `;

            console.log('🤖 [IA] Inicializando modelo Gemini 1.5 Flash...');
            
            // --- USO CORRECTO DEL SDK DE GEMINI ---
            const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

            console.log('🤖 [IA] Enviando prompt e imagen...');
            
            const result = await model.generateContent([promptText, imagePart]);
            const response = await result.response;
            let text = response.text();

            console.log('🤖 [IA] Respuesta cruda recibida:', text);

            if (!text) throw new Error("IA sin respuesta de texto");
            
            // Limpieza de JSON (quitar ```json y ```)
            text = text.replace(/```json/g, '').replace(/```/g, '').trim();
            
            const analysis = JSON.parse(text);

            console.log('✅ [SUCCESS] JSON parseado correctamente:', analysis);

            return res.status(200).json({
                success: true,
                data: analysis
            });

        } catch (error) {
            console.error("❌ [CRITICAL ERROR] analyzeMealAI:", error);
            console.error(error.stack); // Ver el stack trace en logs
            return res.status(501).json({ success: false, message: 'Error al analizar el plato', error: error.message });
        }
    },
};
