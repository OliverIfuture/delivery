const Diet = require('../models/diet.js');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

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
            const file = req.file; // Multer coloca el archivo aquí

            if (!file || !id_diet) {
                return res.status(400).json({ success: false, message: 'Falta el archivo PDF o el ID de la dieta.' });
            }

            // 1. Preparar el Modelo (Gemini 1.5 Flash es ideal para esto)
            const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

            // 2. Convertir el archivo a formato compatible con Gemini (Base64)
            const pdfData = {
                inlineData: {
                    data: file.buffer.toString("base64"),
                    mimeType: "application/pdf",
                },
            };

            // 3. El Prompt Mágico (Ingeniería de Prompts)
            const prompt = `
                Actúa como un nutricionista experto y asistente de compras.
                Analiza este plan alimenticio (PDF) adjunto.
                
                Tu tarea es:
                1. Extraer TODOS los ingredientes necesarios para seguir esta dieta durante 1 semana completa.
                2. Consolidar las cantidades (ej: si lunes pide 100g de pollo y martes 200g, pon "300g de Pechuga de Pollo").
                3. Extraer instrucciones de preparación muy breves y prácticas para las comidas principales.

                IMPORTANTE: Tu respuesta debe ser EXCLUSIVAMENTE un objeto JSON válido sin texto adicional ni bloques de código markdown, con esta estructura exacta:
                {
                    "shopping_list": [
                        {"item": "Nombre del ingrediente", "quantity": "Cantidad total estimada", "category": "Carnes/Verduras/Granos/etc"}
                    ],
                    "prep_guide": [
                        {"meal": "Nombre comida (ej. Desayuno)", "tips": "Instrucción breve (ej. Cocer avena con agua 5min)"}
                    ],
                    "summary": "Un resumen de 1 linea motivacional sobre esta dieta"
                }
            `;

            console.log(`[AI] Analizando dieta ID ${id_diet} con Gemini...`);

            // 4. Enviar a Gemini
            const result = await model.generateContent([prompt, pdfData]);
            const response = await result.response;
            let text = response.text();

            // Limpieza de seguridad del JSON (por si la IA responde con ```json ... ```)
            text = text.replace(/```json/g, '').replace(/```/g, '').trim();

            let aiAnalysis;
            try {
                aiAnalysis = JSON.parse(text);
            } catch (e) {
                console.error("Error parseando JSON de IA:", text);
                throw new Error("La IA no devolvió un JSON válido.");
            }

            // 5. Guardar el resultado en la Base de Datos
            // Asumimos que agregaste la columna 'ai_analysis' tipo JSONB a tu tabla 'diets'
            const sqlUpdate = `
                UPDATE diets
                SET ai_analysis = $1, updated_at = NOW()
                WHERE id = $2
                RETURNING id
            `;

            await db.none(sqlUpdate, [aiAnalysis, id_diet]);

            console.log(`[AI] Análisis guardado correctamente para dieta ${id_diet}`);

            // 6. Responder al cliente
            return res.status(200).json({
                success: true,
                message: 'Dieta analizada con éxito. Lista de compras generada.',
                data: aiAnalysis
            });

        } catch (error) {
            console.error("Error en analyzeDietPdf:", error);
            return res.status(501).json({
                success: false,
                message: 'Error al analizar la dieta con IA',
                error: error.message
            });
        }
    }

};
