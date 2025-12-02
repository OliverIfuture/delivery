const NutritionLog = require('../models/nutritionLog');
const NutritionGoals = require('../models/nutritionGoals');
const db = require('../config/config'); // Necesario para deleteLog si usas db.none

// --- 1. CONFIGURACIÓN DE IA (ESTILO NUEVO SDK) ---
const { GoogleGenAI } = require("@google/genai");
const aiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
// -------------------------------------------------

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

            console.log('📦 Datos recibidos:', { 
                weight, 
                description, 
                fileRecibido: file ? 'Sí' : 'No',
                mimetype: file ? file.mimetype : 'N/A' // Aquí veías 'application/octet-stream'
            });

            if (!file) {
                return res.status(400).json({ success: false, message: 'Falta la foto del plato.' });
            }

            // --- CORRECCIÓN CRÍTICA DE MIME TYPE ---
            // Gemini falla si recibe 'application/octet-stream'.
            // Como sabemos que es una foto de celular, forzamos a 'image/jpeg' si es genérico.
            let mimeTypeToSend = file.mimetype;
            if (mimeTypeToSend === 'application/octet-stream') {
                console.log('⚠️ MIME type genérico detectado. Forzando a image/jpeg.');
                mimeTypeToSend = 'image/jpeg';
            }
            // ---------------------------------------

            // Convertir buffer a base64
            const base64Data = file.buffer.toString("base64");

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

            console.log(`🤖 [IA] Enviando imagen (${mimeTypeToSend}) a Gemini...`);
            
            // --- USO NUEVO DEL SDK (@google/genai) ---
            const response = await aiClient.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: [
                    {
                        parts: [
                            { text: promptText },
                            // Usamos la variable corregida 'mimeTypeToSend'
                            { inlineData: { mimeType: mimeTypeToSend, data: base64Data } }
                        ]
                    }
                ]
            });

            // Extracción de texto basada en la estructura del nuevo SDK
            let text;
            if (response && response.candidates && response.candidates.length > 0) {
                const firstCandidate = response.candidates[0];
                if (firstCandidate.content && firstCandidate.content.parts && firstCandidate.content.parts.length > 0) {
                    text = firstCandidate.content.parts[0].text;
                }
            }

            console.log('🤖 [IA] Respuesta cruda recibida:', text);

            if (!text) throw new Error("IA sin respuesta de texto");
            
            // Limpieza de JSON
            text = text.replace(/```json/g, '').replace(/```/g, '').trim();
            
            let analysis;
            try {
                analysis = JSON.parse(text);
            } catch (e) {
                console.error("Error parseando JSON de IA:", text);
                throw new Error("La IA no devolvió un JSON válido.");
            }

            console.log('✅ [SUCCESS] JSON parseado correctamente:', analysis);

            return res.status(200).json({
                success: true,
                data: analysis
            });

        } catch (error) {
            console.error("❌ [CRITICAL ERROR] analyzeMealAI:", error);
            // Verificar si es error de la API de Google para dar más detalle
            if (error.response) {
                console.error("Detalle API Google:", JSON.stringify(error.response, null, 2));
            }
            return res.status(501).json({ success: false, message: 'Error al analizar el plato', error: error.message });
        }
    },
};
