const Diet = require('../models/diet.js');
const { GoogleGenAI } = require("@google/genai");
const aiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const db = require('../config/config');

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

            console.log(`[AI] Iniciando análisis extendido (con precios) para dieta ${id_diet}...`);

            // 1. Convertir el buffer a Base64
            const base64Data = file.buffer.toString("base64");

            // 2. El Prompt de Ingeniería (ACTUALIZADO PARA PRECIOS Y LUGARES)
            const promptText = `
                Actúa como un nutricionista experto y economista doméstico en México. Analiza este plan alimenticio (PDF).
                
                Tareas:
                1. Extrae TODOS los ingredientes para 1 semana.
                2. Consolida cantidades (ej: "300g Pechuga de Pollo").
                3. Extrae instrucciones breves de preparación.
                4. ESTIMA EL COSTO: Calcula un rango de precio aproximado total de la lista de compras en Pesos Mexicanos (MXN) basado en precios promedio de supermercado.
                5. RECOMIENDA LUGARES: Sugiere 3 tipos de tiendas o supermercados en México ideales para comprar estos insumos (ej. "Mercado de Abastos" para frutas, "Costco" para proteínas a granel).

                IMPORTANTE: Responde SOLO con un JSON válido con esta estructura exacta, sin markdown:
                {
                    "shopping_list": [
                        {"item": "Nombre ingrediente", "quantity": "Cantidad total", "category": "Carnes/Verduras/Etc"}
                    ],
                    "prep_guide": [
                        {"meal": "Nombre comida", "tips": "Instrucción breve"}
                    ],
                    "economics": {
                        "estimated_total": "$1,200 - $1,500 MXN",
                        "tips": "Tip breve para ahorrar (ej. Comprar pollo a granel y congelar)",
                        "supermarkets": [
                            {"name": "Nombre Tienda 1", "reason": "Razón breve"},
                            {"name": "Nombre Tienda 2", "reason": "Razón breve"},
                            {"name": "Nombre Tienda 3", "reason": "Razón breve"}
                        ]
                    },
                    "summary": "Resumen motivacional corto"
                }
            `;

            // 3. Llamada a la IA
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

            // 4. Procesar Respuesta
            let text;
            if (response && response.candidates && response.candidates.length > 0) {
                const firstCandidate = response.candidates[0];
                if (firstCandidate.content && firstCandidate.content.parts && firstCandidate.content.parts.length > 0) {
                    text = firstCandidate.content.parts[0].text;
                }
            }

            if (!text) {
                throw new Error("La IA no generó respuesta de texto.");
            }

            // Limpieza de JSON
            text = text.replace(/```json/g, '').replace(/```/g, '').trim();

            let aiAnalysis;
            try {
                aiAnalysis = JSON.parse(text);
            } catch (e) {
                console.error("Error parseando JSON:", text);
                throw new Error("La IA no devolvió un JSON válido.");
            }

            // 5. Guardar en BD
            // Usamos db.one porque usamos RETURNING id
            const sqlUpdate = `
                UPDATE diets
                SET ai_analysis = $1
                WHERE id = $2
                RETURNING id
            `;

            await db.one(sqlUpdate, [aiAnalysis, id_diet]);

            console.log(`[AI] Éxito. Análisis guardado.`);

            return res.status(200).json({
                success: true,
                message: 'Análisis completado con Gemini.',
                data: aiAnalysis
            });

        } catch (error) {
            console.error("Error en analyzeDietPdf:", error);
            return res.status(501).json({
                success: false,
                message: 'Error al analizar la dieta',
                error: error.message || error.toString()
            });
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


};
