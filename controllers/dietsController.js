const Diet = require('../models/diet.js');
const { GoogleGenAI } = require("@google/genai");
const aiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const db = require('../config/config');

/**
 * FUNCIÓN AUXILIAR: Procesa Gemini y actualiza la BD en segundo plano.
 */
const processGeminiBackground = async (analysisId, files, physiologyStr) => {
    try {
        console.log(`[BG-PROCESS] Ejecutando Gemini para ID ${analysisId}...`);
        
        // 1. Preparar imágenes (Forzando JPEG)
        const imageParts = files.map(file => {
            let finalMimeType = file.mimetype;
            if (finalMimeType === 'application/octet-stream') {
                finalMimeType = 'image/jpeg';
            }
            return {
                inlineData: { mimeType: finalMimeType, data: file.buffer.toString("base64") }
            };
        });

        // 2. Prompt (Sin cambios)
 const promptText = `
        ACTÚA COMO UN NUTRIÓLOGO DEPORTIVO DE ÉLITE Y ANTROPOMETRISTA NIVEL ISAK 3.
        
        TIENES 2 FUENTES DE INFORMACIÓN:
        A) DATOS REPORTADOS POR EL CLIENTE (JSON):
        ${physiologyStr}
        
        B) EVIDENCIA VISUAL (3 FOTOS ADJUNTAS):
        Analiza la estructura ósea, inserciones musculares, acumulación de grasa y postura.
        
        TU OBJETIVO:
        Generar un Plan Nutricional preciso. Si hay contradicción, PRIORIZA EL ANÁLISIS VISUAL.
        
        FORMATO DE SALIDA (ESTRICTAMENTE JSON):
        Solo el objeto JSON crudo con esta estructura exacta:
        {
          "analysis": {
            "detected_somatotype": "...",
            "estimated_body_fat": "...",
            "muscle_mass_assessment": "...",
            "visual_observations": "...",
            "caloric_needs": { "goal_calories": 0000, "goal_type": "..." },
            "macros": { "protein": "...", "carbs": "...", "fats": "..." }
          },
          "diet_plan": {
            "overview": "...",
            "daily_menu": [
                { "meal_name": "...", "options": [ { "food": "...", "calories": 000 } ] }
            ],
            "recommendations": ["..."]
          }
        }
        `;

        // 3. CONFIGURACIÓN DE SEGURIDAD (CRUCIAL PARA FITNESS)
        // Usamos strings directos para evitar problemas de importación de enums
        const safetySettings = [
            {
                category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
                threshold: 'BLOCK_NONE', // Permitir todo (necesario para análisis corporal)
            },
            {
                category: 'HARM_CATEGORY_HARASSMENT',
                threshold: 'BLOCK_NONE',
            },
            {
                category: 'HARM_CATEGORY_HATE_SPEECH',
                threshold: 'BLOCK_NONE',
            },
            {
                category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
                threshold: 'BLOCK_NONE',
            },
        ];

        // 4. Llamada a Gemini con Safety Settings
        const response = await aiClient.models.generateContent({
            model: 'gemini-1.5-flash',
            contents: [{ parts: [{ text: promptText }, ...imageParts] }],
            safetySettings: safetySettings, // <--- AQUÍ ESTÁ LA SOLUCIÓN
        });

        // 5. Validar y Loguear si falla
        // Si hay bloqueo, response.promptFeedback nos dirá por qué
        if (!response || !response.response || !response.response.candidates || response.response.candidates.length === 0) {
             
             // Intento de loguear la razón del bloqueo si existe
             if (response && response.response && response.response.promptFeedback) {
                 console.error(`[BG-PROCESS] Bloqueo de Gemini:`, JSON.stringify(response.response.promptFeedback));
             }
             
             throw new Error("Sin candidatos válidos de IA (Posible bloqueo de seguridad o imagen ilegible)");
        }

        // 6. Parsear JSON
        let text = response.response.candidates[0].content.parts[0].text;
        text = text.replace(/```json/g, '').replace(/```/g, '').trim();
        const jsonResult = JSON.parse(text);

        // 7. ACTUALIZAR BD
        await AIDiet.updateResult(analysisId, jsonResult);
        console.log(`[BG-PROCESS] ID ${analysisId} completado exitosamente.`);

    } catch (error) {
        console.error(`[BG-PROCESS] Error en ID ${analysisId}: ${error.message}`);
        await AIDiet.updateError(analysisId);
    }
};

module.exports = {

    /**
     * Asignar una nueva dieta
     */
    async assign(req, res, next) {
        try {
            const diet = req.body; // El objeto JSON completo
            // Asegurarnos que el id_company viene del token (más seguro)
            diet.id_company = req.user.mi_store;

            const data = await Diet.create(diet);

            return res.status(201).json({
                success: true,
                message: 'La dieta se ha asignado correctamente.',
                data: { 'id': data.id }
            });
        }
        catch (error) {
            console.log(`Error en dietsController.assign: ${error}`);
            return res.status(501).json({
                success: false,
                message: 'Error al asignar la dieta',
                error: error
            });
        }
    },

    /**
     * Eliminar una asignación de dieta
     */
    async delete(req, res, next) {
        try {
            const id_diet = req.params.id;
            const id_company = req.user.mi_store; // ID del entrenador

            await Diet.delete(id_diet, id_company);

            return res.status(200).json({
                success: true,
                message: 'La dieta se ha eliminado correctamente.'
            });
        }
        catch (error) {
            console.log(`Error en dietsController.delete: ${error}`);
            return res.status(501).json({
                success: false,
                message: 'Error al eliminar la dieta',
                error: error
            });
        }
    },

    /**
     * Buscar todas las dietas creadas por un entrenador
     */
    async findByTrainer(req, res, next) {
        try {
            const id_company = req.params.id_company;
            const data = await Diet.findByTrainer(id_company);
            return res.status(200).json(data);
        }
        catch (error) {
            console.log(`Error en dietsController.findByTrainer: ${error}`);
            return res.status(501).json({
                success: false,
                message: 'Error al buscar dietas por entrenador',
                error: error
            });
        }
    },

    /**
     * Buscar la dieta activa de un cliente (la más reciente)
     */
    async findActiveByClient(req, res, next) {
        try {
            const id_client = req.params.id_client;
            const data = await Diet.findActiveByClient(id_client);
            return res.status(200).json(data);
        }
        catch (error) {
            console.log(`Error en dietsController.findActiveByClient: ${error}`);
            return res.status(501).json({
                success: false,
                message: 'Error al buscar la dieta del cliente',
                error: error
            });
        }
    },

    async analyzeDietPdf(req, res, next) {
        try {
            const { id_diet } = req.body;
            const file = req.file;

            if (!file || !id_diet) {
                return res.status(400).json({ success: false, message: 'Falta el archivo PDF o el ID de la dieta.' });
            }

            console.log(`[AI] Iniciando análisis detallado (Plan Semanal) para dieta ${id_diet}...`);

            const base64Data = file.buffer.toString("base64");

            // --- PROMPT MAESTRO ACTUALIZADO ---
            const promptText = `
                Actúa como un nutricionista experto. Analiza este plan alimenticio (PDF).
                
                Tareas:
                1. Extrae TODOS los ingredientes para la lista de compras y consolida cantidades.
                2. **EXTRAE EL MENÚ SEMANAL DETALLADO:** Necesito saber exactamente qué comer cada día, desglosado por tiempos de comida (Desayuno, Comida, Cena, Snacks). Incluye los alimentos y una breve instrucción muy importante agregarla.
                3. Calcula costos estimados y recomienda lugares.

                IMPORTANTE: Responde SOLO con un JSON válido con esta estructura exacta:
                {
                    "shopping_list": [
                        {"item": "Nombre ingrediente", "quantity": "Cantidad total", "category": "Carnes/Verduras/Etc"}
                    ],
                    "weekly_plan": [
                        {
                            "day": "Lunes",
                            "meals": [
                                {
                                    "time": "Desayuno", 
                                    "food": "Descripción completa de los alimentos (ej. 3 Huevos con 50g de Avena)",
                                    "instructions": "Instrucción breve de preparación (importante)"
                                },
                                {
                                    "time": "Almuerzo",
                                    "food": "...",
                                    "instructions": "..."
                                }
                            ]
                        },
                         {
                            "day": "Martes",
                            "meals": []
                        }
                        // ... resto de los días
                    ],
                    "economics": {
                        "estimated_total": "$MXN",
                        "tips": "Tip ahorro",
                        "supermarkets": [{"name": "Tienda", "reason": "Razón"}]
                    },
                    "summary": "Resumen corto"
                }
            `;

            const response = await aiClient.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: [
                    {
                        parts: [
                            { text: promptText },
                            { inlineData: { mimeType: 'application/pdf', data: base64Data } }
                        ]
                    }
                ]
            });

            // ... (Procesamiento de respuesta y guardado en BD igual que antes) ...
            // ... Asegúrate de copiar el resto de la función igual ...

            // 4. Procesar Respuesta
            let text;
            if (response && response.candidates && response.candidates.length > 0) {
                const firstCandidate = response.candidates[0];
                if (firstCandidate.content && firstCandidate.content.parts && firstCandidate.content.parts.length > 0) {
                    text = firstCandidate.content.parts[0].text;
                }
            }

            if (!text) throw new Error("La IA no generó respuesta de texto.");

            text = text.replace(/```json/g, '').replace(/```/g, '').trim();

            let aiAnalysis;
            try {
                aiAnalysis = JSON.parse(text);
            } catch (e) {
                console.error("Error parseando JSON:", text);
                throw new Error("La IA no devolvió un JSON válido.");
            }

            const sqlUpdate = `
                UPDATE diets
                SET ai_analysis = $1
                WHERE id = $2
                RETURNING id
            `;

            await db.one(sqlUpdate, [aiAnalysis, id_diet]);

            return res.status(200).json({
                success: true,
                message: 'Análisis completado.',
                data: aiAnalysis
            });

        } catch (error) {
            console.error("Error en analyzeDietPdf:", error);
            return res.status(501).json({ success: false, message: 'Error al analizar', error: error.message });
        }
    },

    async getDietById(req, res, next) {
        try {
            const { id } = req.params;

            const diet = await db.oneOrNone(`
                SELECT * FROM diets WHERE id = $1
            `, [id]);

            if (!diet) {
                return res.status(404).json({
                    success: false,
                    message: 'Dieta no encontrada'
                });
            }

            return res.status(200).json({
                success: true,
                data: diet // Regresa la dieta con el campo 'ai_analysis' ya lleno
            });

        } catch (error) {
            console.error(`Error en getDietById: ${error}`);
            return res.status(501).json({
                success: false,
                message: 'Error al obtener la dieta',
                error: error.message
            });
        }
    },


async startDietAnalysis(req, res, next) {
        try {
            const files = req.files;
            const physiologyStr = req.body.physiology;
            const id_client = req.user.id;

            if (!files || files.length < 1) {
                return res.status(400).json({ success: false, message: 'Faltan imágenes.' });
            }

            // 1. Guardar en BD como "pending" INMEDIATAMENTE
            const newAnalysis = await Diet.createPending(id_client, JSON.parse(physiologyStr));
            const analysisId = newAnalysis.id;

            console.log(`[AI-POLLING] Iniciado análisis ID: ${analysisId} para cliente ${id_client}`);

            // 2. RESPONDER AL CLIENTE YA (Para evitar timeout H12)
            res.status(202).json({
                success: true,
                message: 'Analizando en segundo plano...',
                data: { id: analysisId, status: 'pending' }
            });

            // 3. INICIAR PROCESO PESADO (Llamada directa sin 'this')
            processGeminiBackground(analysisId, files, physiologyStr);

        } catch (error) {
            console.error(`Error inicio análisis: ${error}`);
            if (!res.headersSent) {
                 return res.status(501).json({ success: false, error: error.message });
            }
        }
    },

    /**
     * FUNCIÓN INTERNA: Procesa Gemini y actualiza la BD (No es una ruta)
     */
    async processGeminiBackground(analysisId, files, physiologyStr) {
        try {
            console.log(`[BG-PROCESS] Ejecutando Gemini para ID ${analysisId}...`);
            
            // Preparar imágenes
            const imageParts = files.map(file => ({
                inlineData: { mimeType: file.mimetype, data: file.buffer.toString("base64") }
            }));

            // Prompt (El mismo de siempre)
            const promptText = `ACTÚA COMO UN NUTRIÓLOGO... (Tu prompt completo)... JSON`;

            // Llamada Lenta a Gemini
            const response = await aiClient.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: [{ parts: [{ text: promptText }, ...imageParts] }]
            });

            // Validar respuesta
            if (!response || !response.response || !response.response.candidates || response.response.candidates.length === 0) {
                 throw new Error("Sin candidatos válidos de IA");
            }

            // Parsear JSON
            let text = response.response.candidates[0].content.parts[0].text;
            text = text.replace(/```json/g, '').replace(/```/g, '').trim();
            const jsonResult = JSON.parse(text);

            // ACTUALIZAR BD: Marcar como 'completed' y guardar JSON
            await Diet.updateResult(analysisId, jsonResult);
            console.log(`[BG-PROCESS] ID ${analysisId} completado exitosamente.`);

        } catch (error) {
            console.error(`[BG-PROCESS] Error en ID ${analysisId}: ${error.message}`);
            await Diet.updateError(analysisId);
        }
    },

    /**
     * PASO 2 (POLLING): El cliente pregunta "¿Ya terminó?"
     */
async checkStatus(req, res, next) {
        try {
            const id = req.params.id;
            const analysis = await Diet.findById(id);

            if (!analysis) {
                return res.status(404).json({ success: false, message: 'Análisis no encontrado' });
            }

            // Respondemos el estado actual
            return res.status(200).json({
                success: true,
                data: {
                    status: analysis.status, // 'pending', 'completed', 'failed'
                    data: analysis.ai_analysis_result // Será null si está pending
                }
            });

        } catch (error) {
            return res.status(501).json({ success: false, error: error.message });
        }
    },

async generateDietJSON(req, res, next) {
        try {
            const files = req.files;
            const physiologyStr = req.body.physiology;
            const id_client = req.user.id;

            if (!files || files.length < 1) {
                return res.status(400).json({ success: false, message: 'Faltan imágenes.' });
            }

            console.log(`[AI] Analizando cliente ${id_client}...`);

            // 1. Preparar imágenes para Gemini
            const imageParts = files.map(file => ({
                inlineData: { mimeType: file.mimetype, data: file.buffer.toString("base64") }
            }));
            const promptText = `
            ACTÚA COMO UN NUTRIÓLOGO DEPORTIVO DE ÉLITE Y ANTROPOMETRISTA NIVEL ISAK 3.
            
            TIENES 2 FUENTES DE INFORMACIÓN:
            A) DATOS REPORTADOS POR EL CLIENTE (JSON):
            ${physiologyStr}
            
            B) EVIDENCIA VISUAL (3 FOTOS ADJUNTAS):
            Analiza la estructura ósea, inserciones musculares, acumulación de grasa y postura.
            
            TU OBJETIVO:
            Generar un Plan Nutricional preciso. 
            IMPORTANTE: Si los datos del cliente (ej. "Soy muy activo") contradicen la evidencia visual (ej. "Alto porcentaje de grasa"), PRIORIZA TU ANÁLISIS VISUAL para ajustar las calorías y no sobrealimentarlo.
            
            FORMATO DE SALIDA (ESTRICTAMENTE JSON):
            No incluyas texto introductorio ni markdown (\`\`\`json). Solo el objeto JSON crudo con esta estructura exacta:
            
            {
              "analysis": {
                "detected_somatotype": "Ej: Endomorfo-Mesomorfo (Predominancia ósea ancha)",
                "estimated_body_fat": "Ej: 18-22% (Visualmente)",
                "muscle_mass_assessment": "Bajo/Medio/Alto",
                "visual_observations": "Ej: Hombros caídos, acumulación de grasa en zona abdominal (androide).",
                "caloric_needs": {
                    "bmr": 0000,
                    "tdee_adjusted": 0000,
                    "goal_calories": 0000,
                    "goal_type": "Déficit / Superávit / Mantenimiento"
                },
                "macros": {
                    "protein": "000g",
                    "carbs": "000g",
                    "fats": "000g"
                }
              },
              "diet_plan": {
                "overview": "Resumen de 1 linea de la estrategia.",
                "daily_menu": [
                    {
                        "meal_name": "Desayuno",
                        "options": [
                            {"food": "Ej: 3 Huevos revueltos con espinacas", "calories": 250},
                            {"food": "Ej: 1 Scoop de Whey Protein con avena", "calories": 250}
                        ]
                    },
                    {
                        "meal_name": "Almuerzo",
                        "options": [
                            {"food": "Ej: 150g Pechuga de pollo + 100g Arroz", "calories": 400}
                        ]
                    },
                    {
                        "meal_name": "Cena",
                        "options": [
                            {"food": "Ej: Ensalada de atún con aguacate", "calories": 300}
                        ]
                    },
                    {
                        "meal_name": "Snack/Pre-entreno",
                        "options": [
                             {"food": "Ej: Manzana verde y almendras", "calories": 150}
                        ]
                    }
                ],
                "recommendations": [
                    "Recomendación breve 1",
                    "Recomendación breve 2",
                    "Suplemento sugerido (si aplica)"
                ]
              }
            }
            `;

            // 3. Llamar a Gemini
            const response = await aiClient.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: [{ parts: [{ text: promptText }, ...imageParts] }]
            });

            if (!response || !response.response || !response.response.candidates || response.response.candidates.length === 0) {
                 throw new Error("La IA no devolvió candidatos válidos. Posible bloqueo de seguridad o imagen no clara.");
            }
            

            // 4. Limpiar JSON
            let text = response.response.candidates[0].content.parts[0].text;
            text = text.replace(/```json/g, '').replace(/```/g, '').trim();
            const jsonResult = JSON.parse(text);

            // 5. Guardar el registro del ANÁLISIS (solo datos)
            await Diet.create({
                id_client: id_client,
                physiology_data: JSON.parse(physiologyStr),
                ai_analysis_result: jsonResult
            });

            // 6. DEVOLVER JSON A FLUTTER (No generamos PDF aquí)
            return res.status(200).json({
                success: true,
                message: 'Análisis completado',
                data: jsonResult 
            });

        } catch (error) {
            console.error(`Error AI: ${error}`);
            return res.status(501).json({ success: false, message: 'Error en análisis IA', error: error.message });
        }
    },

    /**
     * PASO 2: Recibe el PDF generado por Flutter -> Sube a Firebase -> Actualiza User
     */
async uploadDietPdf(req, res, next) {
        try {
            const file = req.file; 
            const id_client = req.user.id;
            const id_company = null; // Asumimos null como acordamos

            if (!file) {
                return res.status(400).json({ success: false, message: 'No se recibió el PDF.' });
            }

            console.log(`[STORAGE] Subiendo PDF final del cliente ${id_client}...`);

            // 1. Subir a Firebase
            const pathImage = `diet_files/ai_plan_${Date.now()}_${id_client}.pdf`;
            const pdfUrl = await storage(file, pathImage);

            if (pdfUrl) {
                // 2. CREAR REGISTRO EN LA TABLA DIETS
                const newDiet = {
                    id_company: id_company,
                    id_client: id_client,
                    file_url: pdfUrl,
                    file_name: file.originalname || `Plan_IA_${Date.now()}.pdf`
                };

                const data = await Diet.create(newDiet);

                return res.status(201).json({
                    success: true,
                    message: 'Plan guardado exitosamente.',
                    data: data,
                    url: pdfUrl
                });
            } else {
                throw new Error('Falló la subida a Firebase');
            }

        } catch (error) {
            console.error(`Error Upload PDF: ${error}`);
            return res.status(501).json({ success: false, error: error.message });
        }
    }
};
