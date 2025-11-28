const Diet = require('../models/diet.js');
const { GoogleGenAI } = require("@google/genai");
const aiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

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

            console.log(`[AI] Iniciando análisis con nueva librería @google/genai para dieta ${id_diet}...`);

            // 1. Convertir el buffer a Base64
            const base64Data = file.buffer.toString("base64");

            // 2. El Prompt de Ingeniería
            const promptText = `
                Actúa como un nutricionista experto. Analiza este plan alimenticio (PDF).
                
                Tareas:
                1. Extrae TODOS los ingredientes para 1 semana.
                2. Consolida cantidades (ej: si lunes pide 100g pollo y martes 200g, pon "300g Pechuga de Pollo").
                3. Extrae instrucciones breves de preparación.

                IMPORTANTE: Responde SOLO con un JSON válido con esta estructura exacta, sin markdown:
                {
                    "shopping_list": [
                        {"item": "Nombre ingrediente", "quantity": "Cantidad total", "category": "Carnes/Verduras/Etc"}
                    ],
                    "prep_guide": [
                        {"meal": "Nombre comida", "tips": "Instrucción breve"}
                    ],
                    "summary": "Resumen motivacional corto"
                }
            `;

            // 3. Llamada a la IA (Nueva Sintaxis)
            // CAMBIO CRÍTICO: Usamos el nombre completo del modelo estable 'gemini-1.5-flash-001'
            const response = await aiClient.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: [
                    {
                        parts: [
                            { text: promptText },
                            {
                                inlineData: {
                                    mimeType: 'application/pdf',
                                    data: base64Data
                                }
                            }
                        ]
                    }
                ]
            });

            // 4. Procesar Respuesta (CORRECCIÓN DE EXTRACCIÓN)
            // La nueva librería devuelve el objeto crudo, no una función .text()
            let text;

            // Intentamos extraer el texto de la estructura de candidatos
            if (response && response.candidates && response.candidates.length > 0) {
                const firstCandidate = response.candidates[0];
                if (firstCandidate.content && firstCandidate.content.parts && firstCandidate.content.parts.length > 0) {
                    text = firstCandidate.content.parts[0].text;
                }
            }

            // Fallback: Si por alguna razón el objeto tiene .text (futuras versiones), lo intentamos
            if (!text && typeof response.text === 'function') {
                text = response.text();
            }

            if (!text) {
                console.error("Respuesta completa de IA:", JSON.stringify(response, null, 2));
                throw new Error("La IA no generó una respuesta de texto legible.");
            }

            // Limpieza de JSON (Markdown strip)
            text = text.replace(/```json/g, '').replace(/```/g, '').trim();

            let aiAnalysis;
            try {
                aiAnalysis = JSON.parse(text);
            } catch (e) {
                console.error("Error parseando JSON:", text);
                throw new Error("La IA no devolvió un JSON válido.");
            }

            // 5. Guardar en BD
            const sqlUpdate = `
                UPDATE diets
                SET ai_analysis = $1, updated_at = NOW()
                WHERE id = $2
                RETURNING id
            `;

            await db.none(sqlUpdate, [aiAnalysis, id_diet]);

            console.log(`[AI] Éxito. Análisis guardado.`);

            return res.status(200).json({
                success: true,
                message: 'Análisis completado con Gemini (Nuevo SDK).',
                data: aiAnalysis
            });

        } catch (error) {
            console.error("Error en analyzeDietPdf:", error);

            // Log detallado del error de la API para depuración
            if (error.body) {
                console.error("Detalle error API:", JSON.stringify(error.body, null, 2));
            }

            return res.status(501).json({
                success: false,
                message: 'Error al analizar la dieta',
                error: error.message || error.toString()
            });
        }
    }


};
