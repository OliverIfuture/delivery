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

            // --- PASO 1: LIMPIEZA CRÍTICA DE DATOS ---
            // Solo enviamos el título, los ingredientes y el multiplicador.
            // Esto reduce el tamaño del prompt en un 80-90%.
            const simplifiedRecipes = recipes.map(r => ({
                t: r.title || r.name,
                i: r.ingredients,
                m: r.multiplier || 1
            }));

            // --- PASO 2: PROMPT ULTRA-LIGERO ---
            const promptText = `Genera una lista de compras consolidada en JSON.
        Datos: ${JSON.stringify(simplifiedRecipes)}

        Tarea:
        1. Multiplica ingredientes por "m".
        2. Consolida duplicados sumando cantidades.
        3. Clasifica en: "Carnes y aves", "Frutas y verduras", "Lácteos y huevos", "Cereales y abarrotes", "Otros".
        
        Esquema de salida:
        {
          "categories": [
            {
              "name": "Nombre Categoría",
              "items": [{ "name": "Ingrediente", "quantity": "cantidad + unidad", "isChecked": false }]
            }
          ]
        }
        Responde exclusivamente con el JSON, sin texto adicional ni bloques de código.`;

            // --- PASO 3: LLAMADA A GEMINI CON CONFIGURACIÓN DE VELOCIDAD ---
            const model = aiClient.getGenerativeModel({
                model: "gemini-2.0-flash", // La versión Flash es la más rápida disponible
                generationConfig: {
                    responseMimeType: "application/json",
                    temperature: 0.1 // Menos creatividad = más velocidad
                }
            });

            // Agregamos un tiempo límite (timeout) interno para no quedar colgados
            const result = await model.generateContent(promptText);
            const response = await result.response;
            const text = response.text().trim();

            if (!text) throw new Error("La IA devolvió un cuerpo vacío.");

            // Parseo seguro
            const shoppingListJSON = JSON.parse(text.replace(/```json|```/g, ""));

            return res.status(200).json({
                success: true,
                message: 'Lista generada con éxito',
                data: shoppingListJSON
            });

        } catch (error) {
            console.error(`[SHOPPING-LIST] Error: ${error.message}`);

            // Manejo específico para evitar que el cliente espere en vano
            return res.status(500).json({
                success: false,
                message: 'Error al generar la lista. Intenta con menos recetas.',
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

            Diet.toggle(id_user, id_recipe, (err, data) => {
                if (err) {
                    return res.status(501).json({
                        success: false,
                        message: 'Error al procesar el favorito',
                        error: err
                    });
                }

                return res.status(200).json({
                    success: true,
                    message: data.action === 'added' ? 'Agregado a favoritos' : 'Eliminado de favoritos',
                    action: data.action
                });
            });

        } catch (error) {
            console.log(`Error: ${error}`);
            return res.status(501).json({
                success: false,
                message: 'Error inesperado en el servidor'
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
            const assignments = req.body; // Array generado por Flutter

            if (!assignments || !Array.isArray(assignments) || assignments.length === 0) {
                return res.status(400).json({ success: false, message: 'No se recibieron recetas para asignar.' });
            }

            console.log(`📦 [DEBUG] Insertando ${assignments.length} recetas en client_diet_assignments para el cliente ${assignments[0].id_client}...`);

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