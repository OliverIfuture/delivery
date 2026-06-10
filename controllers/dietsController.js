const Diet = require('../models/diet');
// IMPORTS DE LA LIBRERÍA ESTABLE (NO @google/genai)
const { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } = require("@google/generative-ai");
const aiClient = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const db = require('../config/config.js');
const storage = require('../utils/cloud_storage');

/**
 * FUNCIÓN INTERNA: Procesa Gemini y actualiza la BD (Background)
 */
const processDietBackground = async (analysisId, physiologyData) => {
    try {
        console.log(`[BG-PROCESS] ID ${analysisId}: Generando dieta personalizada para:`, physiologyData);

        // --- PROMPT DE "GENERACIÓN PURA" ---
        const promptText = `
        ACTÚA COMO: "Iron Coach", Nutricionista Deportivo de Élite.
        
        PERFIL DEL CLIENTE (DATOS REALES):
        ${JSON.stringify(physiologyData)}

        TU TAREA:
        Diseña un Plan Nutricional Semanal (Lunes a Domingo) 100% personalizado para este perfil.
        
        REGLAS DE GENERACIÓN (OBLIGATORIAS):
        1. **Cálculos:** Usa los datos del cliente (peso, altura, edad, actividad) para calcular sus calorías y macros reales.
        2. **Objetivo:** Si el objetivo es "${physiologyData.goal}", ajusta las calorías (déficit o superávit) acorde a ello.
        3. **Variedad:** No repitas el mismo menú todos los días. Varía las fuentes de proteína y carbohidratos.
        4. **Cocina:** Incluye instrucciones breves de preparación en cada comida.

        FORMATO DE SALIDA (JSON ESTRICTO):
        Responde SOLO con un JSON válido usando esta estructura exacta (llena los valores tú mismo):

        {
          "analysis": {
            "somatotype_estimation": "Tu estimación basada en los datos",
            "daily_calories_target": 0, 
            "macros_distribution": { 
                "protein": "0g", 
                "carbs": "0g", 
                "fats": "0g" 
            },
            "strategy_summary": "Explica brevemente por qué elegiste estos macros para este usuario."
          },
          "weekly_plan": [
            // GENERA OBJETOS PARA LOS 7 DÍAS (Lunes a Domingo)
            {
              "day": "Lunes",
              "meals": [
                {
                  "type": "Desayuno",
                  "name": "Nombre creativo del plato",
                  "ingredients": "Lista exacta de ingredientes con cantidades (ej: 200g Clara de Huevo)",
                  "instructions": "Instrucciones de preparación paso a paso.",
                  "calories_approx": 0
                },
                // ... más comidas
              ]
            }
            // ... CONTINÚA HASTA EL DOMINGO
          ]
        }
        `;

        const safetySettings = [
            { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
            { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
            { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
            { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
        ];

        const model = aiClient.getGenerativeModel({
            model: "gemini-2.5-flash", // O gemini-1.5-pro si prefieres
            safetySettings: safetySettings
        });

        const result = await model.generateContent(promptText);
        const response = await result.response;
        let text = response.text();

        if (!text) throw new Error("La IA no generó respuesta.");

        // Limpieza de JSON
        text = text.replace(/```json/g, '').replace(/```/g, '').trim();

        let jsonResult;
        try {
            jsonResult = JSON.parse(text);
        } catch (e) {
            console.error("Error parseando JSON:", text);
            throw new Error("La IA no devolvió un JSON válido.");
        }

        await Diet.updateResult(analysisId, jsonResult);
        console.log(`[BG-PROCESS] Dieta Personalizada ID ${analysisId} terminada.`);

    } catch (error) {
        console.error(`[BG-PROCESS] Error ID ${analysisId}: ${error.message}`);
        await Diet.updateError(analysisId);
    }
};

module.exports = {

    async createRecipeWithImage(req, res, next) {
        try {
            // Parseamos los datos que vienen en los fields del MultipartRequest
            const recipe = JSON.parse(req.body.recipe);
            const ingredientsArray = JSON.parse(req.body.ingredients_array);
            const files = req.files;

            // Si viene una imagen, la subimos a Firebase
            if (files && files.length > 0) {
                const pathImage = `recipes_${Date.now()}`;
                const url = await storage(files[0], pathImage);

                if (url != undefined && url != null) {
                    recipe.image_url = url; // Asignamos la URL al objeto receta
                }
            }

            // 1. Insertamos la receta y obtenemos el ID generado
            const idRecipe = await Diet.createRecipe(recipe);

            // 2. Insertamos los ingredientes en la tabla pivote
            if (ingredientsArray && ingredientsArray.length > 0) {
                await Diet.insertIngredientsMap(idRecipe, ingredientsArray);
            }

            return res.status(201).json({
                success: true,
                message: 'Receta creada correctamente',
                data: idRecipe
            });

        } catch (error) {
            console.log(`❌ Error en createRecipeWithImage: ${error}`);
            return res.status(501).json({
                success: false,
                message: 'Error al registrar la receta',
                error: error.message
            });
        }
    },

    /**
     * Asignar una nueva dieta (MANUAL / DEL ENTRENADOR)
     */
    async assign(req, res, next) {
        try {
            const diet = req.body;

            // 1. ASIGNAR ID DEL ENTRENADOR (Desde el token)
            diet.id_company = req.user.mi_store;

            console.log("📦 [DEBUG] Intentando insertar Dieta Manual:");
            console.log("   -> id_client:", diet.id_client);
            console.log("   -> id_company:", diet.id_company);
            console.log("   -> file_url:", diet.file_url);

            if (!diet.id_client) {
                return res.status(400).json({ success: false, message: 'Falta el id_client' });
            }

            // CAMBIO AQUÍ: Usamos createAssignment para la tabla 'diets'
            const data = await Diet.createAssignment(diet);

            console.log("✅ [DEBUG] ID Generado en BD:", data.id);

            return res.status(201).json({
                success: true,
                message: 'La dieta se ha asignado correctamente.',
                data: { 'id': data.id }
            });
        }
        catch (error) {
            console.log(`❌ Error en dietsController.assign: ${error}`);
            return res.status(501).json({
                success: false,
                message: 'Error al asignar la dieta',
                error: error.message || error
            });
        }
    },

    /**
     * Eliminar una asignación de dieta
     */
    async delete(req, res, next) {
        try {
            const id_diet = req.params.id;
            const id_company = req.user.mi_store;

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

            console.log(`[AI] Iniciando análisis estricto (JSON Schema) para dieta ${id_diet}...`);

            const base64Data = file.buffer.toString("base64");

            // --- PROMPT BLINDADO PARA FLUTTER ---
            const promptText = `
                ACTÚA COMO UN ANALISTA DE DATOS Y NUTRICIONISTA PARA UNA APP MÓVIL.
                
                TU TAREA:
                Analiza el PDF adjunto y extrae los datos estructurados siguiendo ESTRICTAMENTE el esquema JSON solicitado.
                
                REGLAS DE FORMATO (CRÍTICAS PARA QUE LA APP NO FALLE):
                1. **shopping_list**: DEBE ser una LISTA DE OBJETOS. NUNCA devuelvas strings simples.
                   - Formato requerido: { "item": "Nombre", "quantity": "Cantidad exacta", "category": "Grupo (Frutas, Carnes, etc)" }
                
                2. **weekly_plan**: Array de 7 días.
                   - "meals": DEBE ser una LISTA DE OBJETOS. NO uses claves como "Desayuno": "...".
                   - Formato requerido: { "time": "Desayuno/Comida/Cena", "food": "Descripción del plato", "instructions": "Instrucción breve" }
                
                3. **economics**:
                   - "estimated_cost": Calcula el costo en DÓLARES (USD/$).
                   - NO recomiendes supermercados específicos (es una app global).
                
                EJEMPLO DE SALIDA JSON (Sigue esta estructura exactamente):
                {
                    "summary": "Plan alto en proteínas...",
                    "shopping_list": [
                        { "item": "Avena", "quantity": "500g", "category": "Cereales" },
                        { "item": "Pollo", "quantity": "1kg", "category": "Carnes" }
                    ],
                    "weekly_plan": [
                        {
                            "day": "Lunes",
                            "meals": [
                                { "time": "Desayuno", "food": "Huevos revueltos", "instructions": "Batir 3 huevos..." },
                                { "time": "Almuerzo", "food": "Pollo y arroz", "instructions": "A la plancha..." }
                            ]
                        }
                    ],
                    "economics": {
                        "estimated_cost": "80-100 USD",
                        "recommendations": "Compra a granel para ahorrar..."
                    }
                }
            `;

            // 1. OBTENER INSTANCIA DEL MODELO
            const model = aiClient.getGenerativeModel({
                model: "gemini-2.0-flash", // Recomendado para seguir instrucciones complejas
                generationConfig: { responseMimeType: "application/json" } // FORZAMOS MODO JSON NATIVO
            });

            // 2. GENERAR CONTENIDO
            const result = await model.generateContent([
                promptText,
                {
                    inlineData: {
                        mimeType: 'application/pdf',
                        data: base64Data
                    }
                }
            ]);

            const response = await result.response;
            let text = response.text();

            if (!text) throw new Error("La IA no generó respuesta de texto.");

            // Limpieza de JSON (por si acaso manda markdown)
            text = text.replace(/```json/g, '').replace(/```/g, '').trim();

            let aiAnalysis;
            try {
                aiAnalysis = JSON.parse(text);
            } catch (e) {
                console.error("Error parseando JSON:", text);
                throw new Error("La IA no devolvió un JSON válido.");
            }

            // Actualizar la base de datos
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
                data: diet
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

    // --- FLUJO IA CON IMÁGENES (POLLING) ---
    async startDietAnalysis(req, res, next) {
        try {
            const files = req.files;
            const physiologyStr = req.body.physiology;
            const id_client = req.user.id;

            if (!files || files.length < 1) {
                return res.status(400).json({ success: false, message: 'Faltan imágenes.' });
            }

            // 1. Guardar en BD como "pending" INMEDIATAMENTE
            // Nota: Este usa createPending, que apunta a ai_generated_diets. Está bien.
            const newAnalysis = await Diet.createPending(id_client, JSON.parse(physiologyStr));
            const analysisId = newAnalysis.id;

            console.log(`[AI-POLLING] Iniciado análisis ID: ${analysisId} para cliente ${id_client}`);

            // 2. RESPONDER AL CLIENTE YA
            res.status(202).json({
                success: true,
                message: 'Analizando en segundo plano...',
                data: { id: analysisId, status: 'pending' }
            });

            // 3. INICIAR PROCESO PESADO (Llamada directa sin 'this')
            // OJO: Aquí no hay 'await' intencionalmente para liberar el request
            // Asegúrate de que processGeminiBackground esté accesible o definido abajo
            module.exports.processGeminiBackground(analysisId, files, physiologyStr);

        } catch (error) {
            console.error(`Error inicio análisis: ${error}`);
            if (!res.headersSent) {
                return res.status(501).json({ success: false, error: error.message });
            }
        }
    },

    /**
     * FUNCIÓN INTERNA: Procesa Gemini con IMÁGENES
     */
    async processGeminiBackground(analysisId, files, physiologyStr) {
        try {
            console.log(`[BG-PROCESS] Ejecutando Gemini para ID ${analysisId}...`);

            // Preparar imágenes
            const imageParts = files.map(file => ({
                inlineData: { mimeType: file.mimetype, data: file.buffer.toString("base64") }
            }));

            // Prompt
            const promptText = `
            ACTÚA COMO UN NUTRIÓLOGO DEPORTIVO... (Prompt completo de análisis visual)...
            Responde SOLO JSON.
            `;

            // Llamada Lenta a Gemini
            const response = await aiClient.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: [{ parts: [{ text: promptText }, ...imageParts] }]
            });

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
     * POLLING: Consultar Estado
     */
    async checkStatus(req, res, next) {
        try {
            const id = req.params.id;
            const analysis = await Diet.findById(id);

            if (!analysis) return res.status(404).json({ success: false, message: 'No encontrado' });

            return res.status(200).json({
                success: true,
                data: {
                    status: analysis.status,
                    data: analysis.ai_analysis_result
                }
            });

        } catch (error) {
            return res.status(501).json({ success: false, error: error.message });
        }
    },

    // --- FLUJO DIRECTO (SIN POLLING, BLOQUEANTE) ---
    async generateDietJSON(req, res, next) {
        try {
            const files = req.files;
            const physiologyStr = req.body.physiology;
            const id_client = req.user.id;

            if (!files || files.length < 1) {
                return res.status(400).json({ success: false, message: 'Faltan imágenes.' });
            }

            console.log(`[AI] Analizando cliente ${id_client}...`);

            const imageParts = files.map(file => ({
                inlineData: { mimeType: file.mimetype, data: file.buffer.toString("base64") }
            }));
            const promptText = `
            ACTÚA COMO UN NUTRIÓLOGO DEPORTIVO DE ÉLITE...
            (Prompt completo para imágenes + datos)
            FORMATO DE SALIDA (ESTRICTAMENTE JSON)...
            `;

            const response = await aiClient.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: [{ parts: [{ text: promptText }, ...imageParts] }]
            });

            if (!response || !response.response || !response.response.candidates || response.response.candidates.length === 0) {
                throw new Error("La IA no devolvió candidatos válidos.");
            }

            let text = response.response.candidates[0].content.parts[0].text;
            text = text.replace(/```json/g, '').replace(/```/g, '').trim();
            const jsonResult = JSON.parse(text);

            // CAMBIO AQUÍ: Usamos createAIEntry porque va a la tabla 'ai_generated_diets'
            // y le pasamos los datos con la estructura correcta.
            await Diet.createAIEntry({
                id_client: id_client,
                physiology_data: JSON.parse(physiologyStr),
                ai_analysis_result: jsonResult
            });

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
     * FLUJO: Generación de Dieta SOLO DATOS (Sin imágenes)
     */
    async generateDietJSON_NoImages(req, res, next) {
        try {
            const physiologyData = req.body;
            const id_client = req.user.id;

            console.log(`[AI-DIET] Recibido para cliente ${id_client}:`, physiologyData);

            // Crear registro 'pending'
            const newAnalysis = await Diet.createPending(id_client, physiologyData);
            const analysisId = newAnalysis.id;

            res.status(202).json({
                success: true,
                message: 'Calculando plan personalizado...',
                data: { id: analysisId, status: 'pending' }
            });

            // Ejecutar la IA en segundo plano
            processDietBackground(analysisId, physiologyData);

        } catch (error) {
            console.error(`Error inicio: ${error}`);
            if (!res.headersSent) res.status(501).json({ success: false, error: error.message });
        }
    },


    /**
     * 🛒 GENERAR LISTA DE COMPRAS CON IA
     * Toma el plan asignado al cliente, consolida ingredientes y genera la lista.
     */
    /**
         * 🛒 GENERAR LISTA DE COMPRAS CON IA (POST)
         */
    async generateShoppingList(req, res, next) {
        try {
            const { recipes, days } = req.body;

            if (!recipes || !Array.isArray(recipes) || recipes.length === 0) {
                return res.status(400).json({ success: false, message: 'Faltan las recetas para analizar.' });
            }

            console.log(`[SHOPPING-LIST] Procesando ${recipes.length} recetas para ${days} días.`);

            // =======================================================
            // 1. TU BASE DE DATOS DE INGREDIENTES (Diccionario Oficial)
            // =======================================================
            const dbIngredients = [
                { name: "Aderezo César", unit: "g", category: "Otros" },
                { name: "Mayonesa regular", unit: "g", category: "Otros" },
                { name: "Combo Carls Jr: Charbroiled Chicken Club", unit: "combo", category: "Otros" },
                { name: "Combo Carls Jr: Super Star con Queso", unit: "combo", category: "Otros" },
                { name: "3 Tacos de Pescado Clásicos (Capeados)", unit: "orden", category: "Otros" },
                { name: "Caldo de Mariscos (Plato Grande)", unit: "porción", category: "Pescados y mariscos" },
                { name: "Burro de carne asada mediano", unit: "porción", category: "Carnes y aves" },
                { name: "Ajo en polvo, sal, pimienta negra y pimentón de la Vera", unit: "g", category: "Cereales y abarrotes" },
                { name: "Patata o boniato", unit: "g", category: "Frutas y verduras" },
                { name: "Aceite de Oliva Virgen Extra (AOVE)", unit: "ml", category: "Cereales y abarrotes" },
                { name: "Verduras a elegir (calabacín, cebolla, brócoli, champiñones)", unit: "g", category: "Frutas y verduras" },
                { name: "Pimentón dulce y azafrán (o colorante)", unit: "g", category: "Cereales y abarrotes" },
                { name: "Verduras picadas (pimiento rojo, verde, cebolla y ajo)", unit: "g", category: "Frutas y verduras" },
                { name: "Caldo de pollo", unit: "ml", category: "Carnes y aves" },
                { name: "Cacao en polvo (sin azúcar)", unit: "g", category: "Cereales y abarrotes" },
                { name: "Aceite de coco", unit: "g", category: "Cereales y abarrotes" },
                { name: "Mantequilla / Ghee", unit: "g", category: "Lácteos y huevos" },
                { name: "Leche de almendras (sin azúcar)", unit: "ml", category: "Lácteos y huevos" },
                { name: "Pistaches (sin cáscara)", unit: "g", category: "Cereales y abarrotes" },
                { name: "Semillas de girasol", unit: "g", category: "Cereales y abarrotes" },
                { name: "Semillas de calabaza (Pepitas)", unit: "g", category: "Cereales y abarrotes" },
                { name: "Cilantro fresco", unit: "g", category: "Frutas y verduras" },
                { name: "Sal de mesa / Sal del Himalaya", unit: "g", category: "Cereales y abarrotes" },
                { name: "Paprika / Pimentón", unit: "g", category: "Cereales y abarrotes" },
                { name: "Cúrcuma en polvo", unit: "g", category: "Cereales y abarrotes" },
                { name: "Orégano seco", unit: "g", category: "Cereales y abarrotes" },
                { name: "Canela en polvo", unit: "g", category: "Cereales y abarrotes" },
                { name: "Pimienta negra molida", unit: "g", category: "Cereales y abarrotes" },
                { name: "Edamames (vainas)", unit: "g", category: "Frutas y verduras" },
                { name: "Elote desgranado", unit: "g", category: "Frutas y verduras" },
                { name: "Pan tostado integral", unit: "pieza", category: "Cereales y abarrotes" },
                { name: "Amaranto tostado", unit: "g", category: "Cereales y abarrotes" },
                { name: "Camote / Batata (hervido)", unit: "g", category: "Frutas y verduras" },
                { name: "Papa blanca (hervida)", unit: "g", category: "Frutas y verduras" },
                { name: "Garbanzos (cocidos)", unit: "g", category: "Cereales y abarrotes" },
                { name: "Toronja", unit: "pieza", category: "Frutas y verduras" },
                { name: "Mandarina", unit: "pieza", category: "Frutas y verduras" },
                { name: "Pera", unit: "pieza", category: "Frutas y verduras" },
                { name: "Kiwi", unit: "g", category: "Frutas y verduras" },
                { name: "Mango", unit: "g", category: "Frutas y verduras" },
                { name: "Uvas", unit: "g", category: "Frutas y verduras" },
                { name: "Sandía", unit: "g", category: "Frutas y verduras" },
                { name: "Melón", unit: "g", category: "Frutas y verduras" },
                { name: "Ajo fresco", unit: "diente", category: "Frutas y verduras" },
                { name: "Chícharos (Guisantes)", unit: "g", category: "Frutas y verduras" },
                { name: "Germen de alfalfa", unit: "g", category: "Frutas y verduras" },
                { name: "Cebolla morada", unit: "g", category: "Frutas y verduras" },
                { name: "Betabel (Remolacha)", unit: "g", category: "Frutas y verduras" },
                { name: "Apio", unit: "g", category: "Frutas y verduras" },
                { name: "Ejotes (Judías verdes)", unit: "g", category: "Frutas y verduras" },
                { name: "Berenjena", unit: "g", category: "Frutas y verduras" },
                { name: "Coliflor", unit: "g", category: "Frutas y verduras" },
                { name: "Pulpo (cocido)", unit: "g", category: "Pescados y mariscos" },
                { name: "Tofu firme", unit: "g", category: "Otros" },
                { name: "Muslo de pollo (sin piel/hueso)", unit: "g", category: "Carnes y aves" },
                { name: "Sardina en salsa de tomate", unit: "g", category: "Pescados y mariscos" },
                { name: "Pechuga de pavo (fresca)", unit: "g", category: "Carnes y aves" },
                { name: "Lomo de cerdo magro (crudo)", unit: "g", category: "Carnes y aves" },
                { name: "Claras de huevo líquidas", unit: "ml", category: "Lácteos y huevos" },
                { name: "Soya texturizada (seca)", unit: "g", category: "Otros" },
                { name: "Miel", unit: "g", category: "Cereales y abarrotes" },
                { name: "Semillas de chía", unit: "g", category: "Cereales y abarrotes" },
                { name: "Coco fresco", unit: "g", category: "Frutas y verduras" },
                { name: "Durazno", unit: "pieza", category: "Frutas y verduras" },
                { name: "Papaya", unit: "g", category: "Frutas y verduras" },
                { name: "Piña", unit: "g", category: "Frutas y verduras" },
                { name: "Hummus", unit: "g", category: "Otros" },
                { name: "Gelatina light", unit: "taza", category: "Otros" },
                { name: "Salsa natural (verde/roja/tomate)", unit: "g", category: "Otros" },
                { name: "Aceite (Oliva/Vegetal)", unit: "g", category: "Cereales y abarrotes" },
                { name: "Crema de cacahuate / almendras", unit: "g", category: "Cereales y abarrotes" },
                { name: "Almendras / Nueces", unit: "g", category: "Cereales y abarrotes" },
                { name: "Plátano tabasco", unit: "pieza", category: "Frutas y verduras" },
                { name: "Fresas / Frutos rojos", unit: "g", category: "Frutas y verduras" },
                { name: "Manzana", unit: "pieza", category: "Frutas y verduras" },
                { name: "Maíz palomero", unit: "g", category: "Cereales y abarrotes" },
                { name: "Galleta salada / habanera", unit: "pieza", category: "Cereales y abarrotes" },
                { name: "Pan de caja integral", unit: "pieza", category: "Cereales y abarrotes" },
                { name: "Lentejas cocidas", unit: "g", category: "Cereales y abarrotes" },
                { name: "Tortilla harina integral", unit: "pieza", category: "Cereales y abarrotes" },
                { name: "Pasta integral (cocida)", unit: "g", category: "Cereales y abarrotes" },
                { name: "Quinoa cocida", unit: "g", category: "Cereales y abarrotes" },
                { name: "Arroz blanco/integral (cocido)", unit: "g", category: "Cereales y abarrotes" },
                { name: "Galletas de arroz", unit: "pieza", category: "Cereales y abarrotes" },
                { name: "Avena en hojuelas", unit: "g", category: "Cereales y abarrotes" },
                { name: "Bolillo integral", unit: "pieza", category: "Cereales y abarrotes" },
                { name: "Frijoles de olla / molidos", unit: "g", category: "Cereales y abarrotes" },
                { name: "Totopos horneados", unit: "g", category: "Cereales y abarrotes" },
                { name: "Tostada horneada de maíz", unit: "pieza", category: "Cereales y abarrotes" },
                { name: "Tortilla de maíz", unit: "pieza", category: "Cereales y abarrotes" },
                { name: "Champiñones", unit: "g", category: "Frutas y verduras" },
                { name: "Chayote", unit: "g", category: "Frutas y verduras" },
                { name: "Jícama", unit: "g", category: "Frutas y verduras" },
                { name: "Pepino", unit: "g", category: "Frutas y verduras" },
                { name: "Calabacita", unit: "g", category: "Frutas y verduras" },
                { name: "Espinacas", unit: "g", category: "Frutas y verduras" },
                { name: "Lechuga / Mix hojas verdes", unit: "g", category: "Frutas y verduras" },
                { name: "Espárragos", unit: "g", category: "Frutas y verduras" },
                { name: "Brócoli", unit: "g", category: "Frutas y verduras" },
                { name: "Zanahoria", unit: "g", category: "Frutas y verduras" }
            ];

            // =======================================================
            // 2. FUNCIÓN DE LIMPIEZA PARA EL MATCHING
            // =======================================================
            const normalizeStr = (str) => {
                return str.toLowerCase()
                    .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // Quita acentos
                    .replace(/de|con|sin|en|fresco|cocido|hervido/gi, '') // Quita palabras basura
                    .trim();
            };

            // Creamos un diccionario optimizado para buscar rápido
            const dbSearchMap = dbIngredients.map(item => ({
                original: item,
                normalized: normalizeStr(item.name)
            }));

            // =======================================================
            // 3. EXTRACCIÓN Y MATCHING ESTRICTO
            // =======================================================
            const shoppingCart = {};

            recipes.forEach(recipe => {
                const multiplier = recipe.multiplier || 1;
                const ingredients = recipe.ingredients || [];

                ingredients.forEach(ing => {
                    let rawName = "";
                    let qty = 1;

                    // Extraer cantidad y nombre del string o del JSON
                    if (typeof ing === 'string') {
                        const match = ing.match(/^([\d.,]+)\s*([a-zA-Z]+)?\s*(de\s*)?(.*)$/i);
                        if (match) {
                            qty = parseFloat(match[1]) || 1;
                            rawName = match[4] ? match[4] : ing;
                        } else {
                            rawName = ing;
                        }
                    } else if (typeof ing === 'object') {
                        rawName = ing.name || ing.ingredient || "";
                        qty = parseFloat(ing.quantity || ing.qty || 1);
                    }

                    const totalQty = qty * multiplier;
                    const cleanName = normalizeStr(rawName);

                    // BUSCADOR INTELIGENTE: Encuentra el ingrediente que mejor coincida en la BD
                    let matchedDBItem = null;
                    for (const dbItem of dbSearchMap) {
                        // Si el nombre de la receta incluye la palabra clave de la BD (o viceversa)
                        if (cleanName.includes(dbItem.normalized) || dbItem.normalized.includes(cleanName)) {
                            matchedDBItem = dbItem.original;
                            break;
                        }
                    }

                    // SOLO GUARDAMOS SI EXISTE EN TU BASE DE DATOS
                    if (matchedDBItem) {
                        const uniqueKey = matchedDBItem.name;

                        if (shoppingCart[uniqueKey]) {
                            shoppingCart[uniqueKey].quantity += totalQty;
                        } else {
                            shoppingCart[uniqueKey] = {
                                name: matchedDBItem.name,
                                quantity: totalQty,
                                unit: matchedDBItem.unit,
                                category: matchedDBItem.category
                            };
                        }
                    }
                });
            });

            // =======================================================
            // 4. AGRUPAR EN EL FORMATO ESPERADO (CATEGORÍAS)
            // =======================================================
            const categoriesGrouped = {};

            Object.values(shoppingCart).forEach(item => {
                if (!categoriesGrouped[item.category]) {
                    categoriesGrouped[item.category] = [];
                }

                // Ajuste visual (g -> g, pieza -> pz)
                let displayUnit = item.unit === 'pieza' ? 'pz' : item.unit;
                const quantityStr = `${item.quantity.toFixed(1).replace(/\.0$/, '')} ${displayUnit}`;

                categoriesGrouped[item.category].push({
                    name: item.name, // Nombre oficial de tu BD
                    quantity: quantityStr,
                    isChecked: false
                });
            });

            const finalOutputArray = Object.keys(categoriesGrouped).map(key => ({
                name: key,
                items: categoriesGrouped[key]
            }));

            return res.status(200).json({
                success: true,
                message: 'Lista generada con éxito a partir de la BD oficial',
                data: { categories: finalOutputArray }
            });

        } catch (error) {
            console.error(`[SHOPPING-LIST] Error crítico: ${error.stack || error.message}`);
            return res.status(500).json({
                success: false,
                message: 'Error interno al generar la lista.',
                error: error.message
            });
        }
    },

    async toggleFavorite(req, res) {
        try {
            const { id_user, id_recipe } = req.body;

            if (!id_user || !id_recipe) {
                return res.status(400).json({
                    success: false,
                    message: 'Faltan datos (id_user o id_recipe)'
                });
            }

            // 🔥 LA MAGIA: Usamos await porque tu modelo devuelve una Promesa
            const data = await Diet.toggle(id_user, id_recipe);

            // Como usamos await, el código sigue por aquí inmediatamente en milisegundos
            return res.status(200).json({
                success: true,
                message: data.action === 'added' ? 'Agregado a favoritos' : 'Eliminado de favoritos',
                action: data.action
            });

        } catch (error) {
            // Si PostgreSQL arroja un error, el try/catch lo atrapa automáticamente
            console.log(`❌ Error en toggleFavorite: ${error}`);
            return res.status(501).json({
                success: false,
                message: 'Error al procesar el favorito',
                error: error.message
            });
        }
    },

    /**
     * PASO FINAL: Subida del PDF generado (Firebase -> Tabla 'diets')
     */
    async uploadDietPdf(req, res, next) {
        try {
            const file = req.file;
            const id_client = req.user.id;

            // --- CORRECCIÓN AQUÍ ---
            // Obtenemos el posible ID
            let rawCompanyId = req.user.mi_store || req.user.id_entrenador;

            // Si es 0, '0', undefined o null, forzamos a que sea NULL puro
            let id_company = (rawCompanyId && rawCompanyId != 0 && rawCompanyId != '0')
                ? rawCompanyId
                : null;

            if (!file) {
                return res.status(400).json({ success: false, message: 'No se recibió el PDF.' });
            }

            console.log(`[STORAGE] Subiendo PDF del cliente ${id_client}. Entrenador asignado: ${id_company} (Si es null es correcto)`);

            const pathImage = `diet_files/ai_plan_${Date.now()}_${id_client}.pdf`;
            const pdfUrl = await storage(file, pathImage);

            if (pdfUrl) {
                const newDiet = {
                    id_company: id_company, // Ahora enviará null, no 0
                    id_client: id_client,
                    file_url: pdfUrl,
                    file_name: file.originalname || `Plan_IA_${Date.now()}.pdf`
                };

                // Usamos la función de asignación
                const data = await Diet.createAssignment(newDiet);

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
    },


    // ==========================================================
    // NUEVAS FUNCIONES PARA EL BUILDER DINÁMICO DE DIETAS
    // ==========================================================

    // ==========================================================
    // NUEVAS FUNCIONES PARA EL BUILDER DINÁMICO DE DIETAS
    // ==========================================================

    /**
     * Obtiene las recetas creadas por el entrenador
     */
    async getCompanyRecipes(req, res, next) {
        try {
            const id_company = req.params.id_company;
            const data = await Diet.getCompanyRecipes(id_company);
            return res.status(200).json(data);
        } catch (error) {
            console.error(`Error en getCompanyRecipes: ${error}`);
            return res.status(501).json({ success: false, message: 'Error al obtener recetas', error: error.message });
        }
    },

    /**
     * Obtiene el cuestionario de un cliente por su ID (usando el email internamente en SQL)
     */
    async getClientQuestionnaire(req, res, next) {
        try {
            const id_client = req.params.id_client;
            const data = await Diet.getClientQuestionnaire(id_client);

            if (data && data.questionnaire_data) {
                // Parseamos si viene como string en la BD
                let qData = typeof data.questionnaire_data === 'string'
                    ? JSON.parse(data.questionnaire_data)
                    : data.questionnaire_data;

                return res.status(200).json(qData);
            } else {
                return res.status(200).json(null); // No hay cuestionario
            }
        } catch (error) {
            console.error(`Error en getClientQuestionnaire: ${error}`);
            return res.status(501).json({ success: false, message: 'Error al obtener cuestionario', error: error.message });
        }
    },

    async getClientQuestionnaireWithEmail(req, res, next) {
        try {
            const email = req.params.id_client; // Aunque se llame id_client, sabemos que es el email
            const data = await Diet.getClientQuestionnaireWithEmail(email);

            if (data && data.questionnaire_data) {
                let qData = typeof data.questionnaire_data === 'string'
                    ? JSON.parse(data.questionnaire_data)
                    : data.questionnaire_data;

                // 🔥 FIX: Enviamos el formato que ResponseApi espera
                return res.status(200).json({
                    success: true,
                    message: 'Cuestionario obtenido con éxito',
                    data: qData // Aquí va el objeto del cuestionario
                });
            } else {
                // 🔥 FIX: También aquí para que success sea false de forma controlada
                return res.status(200).json({
                    success: false,
                    message: 'El usuario no tiene un cuestionario registrado',
                    data: null
                });
            }
        } catch (error) {
            console.error(`Error en getClientQuestionnaire: ${error}`);
            return res.status(501).json({
                success: false,
                message: 'Error en el servidor',
                error: error.message
            });
        }
    },

    // En dietsController.js o dietsV2Controller.js
    async getClientDietV2(req, res, next) {
        try {
            const id_client = req.params.id_client;
            const diet = await Diet.getAssignedDietByClient(id_client);

            return res.status(200).json(diet);
        } catch (error) {
            console.error(`❌ Error en getClientDietV2: ${error}`);
            return res.status(501).json({
                success: false,
                message: 'Error al obtener la dieta del cliente',
                error: error.message
            });
        }
    },

    /**
     * Recibe el array de recetas de Flutter y las asigna en batch
     */
    async assignMultipleDiets(req, res, next) {
        try {
            const assignments = req.body;

            if (!assignments || !Array.isArray(assignments) || assignments.length === 0) {
                return res.status(400).json({ success: false, message: 'No se recibieron recetas para asignar.' });
            }

            console.log(`📦 [DEBUG] Insertando ${assignments.length} recetas en client_diet_assignments para el cliente ${assignments[0].id_client}...`);

            // 🔥 ESTE LOG NOS CONFIRMARÁ QUE FLUTTER SÍ MANDA LOS DATOS
            console.log(`🎯 [DEBUG] Metas a guardar -> Cal: ${assignments[0].target_calories}, Prot: ${assignments[0].target_protein}, Carbs: ${assignments[0].target_carbs}, Grasas: ${assignments[0].target_fats}`);

            await Diet.assignMultiple(assignments);

            return res.status(201).json({
                success: true,
                message: 'La dieta dinámica se ha asignado correctamente.'
            });
        } catch (error) {
            console.error(`❌ Error en assignMultipleDiets: ${error}`);
            return res.status(501).json({
                success: false,
                message: 'Error al asignar las recetas al cliente.',
                error: error.message
            });
        }
    },

    /**
     * Obtiene el historial de recetas asignadas mapeadas al modelo de Flutter
     */
    async getAssignedHistory(req, res, next) {
        try {
            const id_company = req.params.id_company;
            const data = await Diet.getAssignedHistory(id_company);
            return res.status(200).json(data);
        } catch (error) {
            console.error(`Error en getAssignedHistory: ${error}`);
            return res.status(501).json({ success: false, message: 'Error al obtener historial', error: error.message });
        }
    },

    async deleteByClientAndRecipe(req, res, next) {
        try {
            // Obtenemos los dos IDs desde los parámetros de la URL
            const id_client = req.params.id_client;
            const id_recipe = req.params.id_recipe;

            await Diet.deleteByClientAndRecipe(id_client, id_recipe);

            return res.status(200).json({
                success: true,
                message: 'Receta eliminada de la dieta del cliente correctamente'
            });
        } catch (error) {
            console.error(`Error en deleteByClientAndRecipe: ${error}`);
            return res.status(501).json({
                success: false,
                message: 'Error al eliminar la receta',
                error: error.message
            });
        }
    },

    async findByCompanyMasetr(req, res, next) {
        try {
            const id_company = req.params.id_company;
            const ingredients = await Diet.findByCompanyMasetr(id_company);

            return res.status(200).json(ingredients);
        } catch (error) {
            console.error(`❌ Error en getIngredientsByCompany: ${error}`);
            return res.status(501).json({
                success: false,
                message: 'Error al obtener los ingredientes',
                error: error.message
            });
        }
    },

    async getRecipesWithIngredients(req, res, next) {
        try {
            const id_company = req.params.id_company;
            const recipes = await Diet.getRecipesByCompany(id_company);

            return res.status(200).json(recipes);
        } catch (error) {
            console.error(`❌ Error en getRecipesWithIngredients: ${error}`);
            return res.status(501).json({
                success: false,
                message: 'Error al obtener las recetas',
                error: error.message
            });
        }
    },
};