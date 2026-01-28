const { GoogleGenerativeAI } = require("@google/generative-ai");
const EvaluationControl = require('../models/evaluationControl.js'); // El modelo nuevo
const Routine = require('../models/routine.js');

const aiClient = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);


// ---------------------------------------------------------
// FUNCIÓN PRIVADA: PROCESAMIENTO DE IA (Corre en background)
// ---------------------------------------------------------
// FUNCIÓN PRIVADA: PROCESAMIENTO DE IA (SQL VERSION)
// ---------------------------------------------------------
async function processGeminiAnalysis(evaluationId, data) {
    // 1. Cambiar a Processing
    try {
        await EvaluationControl.updateStatus(evaluationId, 'processing', null);

        // 2. Llamar a Gemini
        const model = aiClient.getGenerativeModel({ model: "gemini-2.5-pro" }); // Usa 1.5-pro o gemini-pro
        const prompt = `Actúa como entrenador experto. Analiza estos datos y responde SOLO con un JSON válido: ${JSON.stringify(data)}. Dame recomendaciones concretas.`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        // 3. Guardar Resultado (SQL)
        await EvaluationControl.updateStatus(evaluationId, 'completed', text);
        console.log(`Evaluación SQL ID ${evaluationId} completada.`);

    } catch (error) {
        console.error(`Error procesando evaluación ${evaluationId}:`, error);
        await EvaluationControl.updateStatus(evaluationId, 'failed', null);
    }
}
module.exports = {

    // ==========================================
    // NUEVAS FUNCIONES DE IA (Ahora dentro del objeto)
    // ==========================================

    async requestEvaluation(req, res) {
        try {
            // Convertimos a String para asegurar compatibilidad con la DB
            const userId = String(req.body.userId);
            const trainerId = req.body.trainerId ? String(req.body.trainerId) : null;
            const userContextData = req.body.userContextData;

            // 1. VERIFICACIÓN DE 15 DÍAS (SQL)
            const lastEval = await EvaluationControl.findLastCompleted(userId);

            if (lastEval) {
                const lastDate = new Date(lastEval.created_at);
                const daysDiff = (new Date() - lastDate) / (1000 * 60 * 60 * 24);

                if (daysDiff < 15) {
                    return res.status(429).json({
                        success: false,
                        message: `Debes esperar 15 días. Faltan ${Math.ceil(15 - daysDiff)} días.`,
                        canEvaluate: false
                    });
                }
            }

            // 2. CREAR REGISTRO "PENDING" (SQL)
            const newEval = await EvaluationControl.create({
                user_id: userId,
                trainer_id: trainerId,
                status: 'pending'
            });

            // Si tu DB devuelve el ID en un objeto (ej: { id: 50 })
            const pollingId = newEval.id;

            // 3. BACKGROUND PROCESS
            // No usamos await para liberar la respuesta http
            processGeminiAnalysis(pollingId, userContextData);

            // 4. RESPUESTA RÁPIDA
            return res.status(202).json({
                success: true,
                message: "Análisis iniciado.",
                pollingId: pollingId, // ID numérico de Postgres
                status: 'pending'
            });

        } catch (error) {
            console.error(error);
            return res.status(500).json({ success: false, error: error.message });
        }
    },

    // Buscar la última evaluación (sin importar si es pending o completed)
    async getLatestEvaluation(req, res) {
        try {
            const { userId } = req.params;
            // Buscamos la más reciente
            const sql = `SELECT * FROM evaluation_control WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1`;
            const evaluation = await db.oneOrNone(sql, [userId]);

            if (!evaluation) {
                return res.status(200).json({ success: true, data: null });
            }

            return res.status(200).json({
                success: true,
                data: {
                    id: evaluation.id,
                    status: evaluation.status,
                    result: evaluation.result,
                    created_at: evaluation.created_at
                }
            });
        } catch (error) {
            return res.status(500).json({ success: false, error: error.message });
        }
    },

    async checkEvaluationStatus(req, res) {
        try {
            const { pollingId } = req.params;
            const evaluation = await EvaluationControl.findById(pollingId);

            if (!evaluation) {
                return res.status(404).json({ success: false, message: "No encontrado" });
            }

            // --- CORRECCIÓN: Envolvemos todo en un objeto unificado ---
            return res.status(200).json({
                success: true,
                data: {
                    status: evaluation.status, // 'pending', 'processing', 'completed'
                    result: evaluation.result  // Aquí va el texto JSON de la IA (o null)
                }
            });
            // -----------------------------------------------------------

        } catch (error) {
            console.error(error);
            res.status(500).json({ success: false, error: error.message });
        }
    },
    /**
     * Crear una nueva rutina (AHORA SOPORTA CLIENTES GRATUITOS)
     */
    async create(req, res, next) {
        try {
            const routine = req.body;

            // --- NUEVA LÓGICA DE ASIGNACIÓN BLINDADA ---
            // Verificamos explícitamente que NO sea '0' ni 0.
            let idCompany = req.user.mi_store;
            if (idCompany === 0 || idCompany === '0' || idCompany === '') {
                idCompany = null;
            }
            routine.id_company = idCompany;

            // Si es nulo (Freemium), el cliente es el propio usuario logueado
            if (routine.id_company === null) {
                routine.id_client = req.user.id;
            }
            // ----------------------------------

            console.log('--- INTENTANDO CREAR RUTINA (CORREGIDO) ---');
            console.log('ID Company final:', routine.id_company); // AHORA DEBE DECIR 'null'
            console.log('ID Client final:', routine.id_client);

            if (!routine.id_client) {
                return res.status(400).json({ success: false, message: 'Error: No se pudo identificar al cliente para esta rutina.' });
            }

            const data = await Routine.create(routine);

            return res.status(201).json({
                success: true,
                message: 'La rutina se ha creado correctamente.',
                data: { 'id': data.id }
            });
        }
        catch (error) {
            console.log(`Error en routinesController.create: ${error}`);
            return res.status(501).json({
                success: false,
                message: 'Error al crear la rutina',
                error: error.message || error
            });
        }
    },


    /**
     * Actualizar una rutina
     */
    async update(req, res, next) {
        try {
            const routine = req.body;
            await Routine.update(routine);
            return res.status(200).json({
                success: true,
                message: 'La rutina se ha actualizado correctamente.'
            });
        }
        catch (error) {
            console.log(`Error en routinesController.update: ${error}`);
            return res.status(501).json({
                success: false,
                message: 'Error al actualizar la rutina',
                error: error
            });
        }
    },

    /**
     * Eliminar una rutina
     */
    async delete(req, res, next) {
        try {
            const id_routine = req.params.id;
            await Routine.delete(id_routine);
            return res.status(200).json({
                success: true,
                message: 'La rutina se ha eliminado correctamente.'
            });
        }
        catch (error) {
            console.log(`Error en routinesController.delete: ${error}`);
            return res.status(501).json({
                success: false,
                message: 'Error al eliminar la rutina',
                error: error
            });
        }
    },

    /**
     * Activar una rutina
     */
    async setActive(req, res, next) {
        try {
            const id_routine = req.body.id_routine;
            // Aplicamos la misma lógica blindada aquí por si acaso
            let idCompany = req.user.mi_store;
            if (idCompany === 0 || idCompany === '0' || idCompany === '') {
                idCompany = null;
            }
            const id_client = idCompany ? req.body.id_client : req.user.id;

            await Routine.setActive(id_routine, id_client);

            return res.status(200).json({
                success: true,
                message: 'Rutina activada.'
            });
        }
        catch (error) {
            console.log(`Error en routinesController.setActive: ${error}`);
            return res.status(501).json({
                success: false,
                message: 'Error al activar la rutina',
                error: error
            });
        }
    },


    /**
     * Buscar todas las rutinas creadas por un entrenador
     */
    async findByTrainer(req, res, next) {
        try {
            const id_company = req.params.id_company;
            const data = await Routine.findByTrainer(id_company);
            return res.status(200).json(data);
        }
        catch (error) {
            console.log(`Error en routinesController.findByTrainer: ${error}`);
            return res.status(501).json({ success: false, message: 'Error al buscar rutinas', error: error });
        }
    },

    /**
     * Buscar la rutina activa de un cliente
     */
    async findActiveByClient(req, res, next) {
        try {
            const id_client = req.params.id_client;
            const data = await Routine.findActiveByClient(id_client);
            return res.status(200).json(data);
        }
        catch (error) {
            console.log(`Error en routinesController.findActiveByClient: ${error}`);
            return res.status(501).json({ success: false, message: 'Error al buscar rutina activa', error: error });
        }
    },

    /**
     * NUEVO: Obtener todas las rutinas de un cliente
     */
    async findAllByClient(req, res, next) {
        try {
            const id_client = req.user.id;
            const data = await Routine.findAllByClient(id_client);
            return res.status(200).json(data);
        }
        catch (error) {
            console.log(`Error en routinesController.findAllByClient: ${error}`);
            return res.status(501).json({
                success: false,
                message: 'Error al buscar las rutinas del cliente',
                error: error
            });
        }
    },

    async findAllByClient(req, res, next) {
        try {
            const id_client = req.user.id; // Obtenemos el ID del token por seguridad
            const data = await Routine.findAllByClient(id_client);
            return res.status(200).json(data);
        }
        catch (error) {
            console.log(`Error en routinesController.findAllByClient: ${error}`);
            return res.status(501).json({
                success: false,
                message: 'Error al buscar las rutinas del cliente',
                error: error
            });
        }
    },

    /**
     * Obtener listado de plantillas (Para las Cards de Flutter)
     */
    async getSystemTemplates(req, res, next) {
        try {
            const data = await Routine.getSystemTemplates();
            return res.status(200).json(data);
        }
        catch (error) {
            console.log(`Error getting templates: ${error}`);
            return res.status(501).json({
                success: false,
                message: 'Error al obtener plantillas',
                error: error
            });
        }
    },

    /**
     * Activar (Clonar) una plantilla para el usuario
     */
    async activateSystemTemplate(req, res, next) {
        try {
            const id_client = req.user.id; // Del Token JWT
            const id_template = req.body.id_template; // ID de la card seleccionada (1, 2 o 3)

            if (!id_template) {
                return res.status(400).json({ success: false, message: 'Falta el ID de la plantilla' });
            }

            await Routine.activateTemplate(id_client, id_template);

            return res.status(200).json({
                success: true,
                message: '¡Plan activado con éxito! Tu rutina ha sido actualizada.'
            });
        }
        catch (error) {
            console.log(`Error activating template: ${error}`);
            return res.status(501).json({
                success: false,
                message: 'Error al activar el plan',
                error: error.message || error
            });
        }
    },
};
