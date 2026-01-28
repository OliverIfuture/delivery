const { GoogleGenerativeAI } = require("@google/generative-ai");
const EvaluationControl = require('../models/evaluationControl.js'); // El modelo nuevo
const Routine = require('../models/routine.js');

const aiClient = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// ---------------------------------------------------------
// ENDPOINT 1: SOLICITAR EVALUACIÓN (POST)
// ---------------------------------------------------------
exports.requestEvaluation = async (req, res) => {
    try {
        const { userId, trainerId, userContextData } = req.body;

        // 1. VERIFICACIÓN DE 15 DÍAS (Ahorro de costos)
        const lastEval = await EvaluationControl.findOne({
            userId: userId,
            status: 'completed' // Solo cuentan las exitosas
        }).sort({ createdAt: -1 });

        if (lastEval) {
            const daysDiff = (new Date() - new Date(lastEval.createdAt)) / (1000 * 60 * 60 * 24);
            if (daysDiff < 15) {
                return res.status(429).json({
                    success: false,
                    message: `Debes esperar 15 días entre evaluaciones. Faltan ${Math.ceil(15 - daysDiff)} días.`,
                    canEvaluate: false
                });
            }
        }

        // 2. CREAR REGISTRO DE "PENDING"
        // Creamos el ticket inmediatamente para responder a Heroku rápido
        const newEval = new EvaluationControl({
            userId,
            trainerId,
            status: 'pending'
        });
        await newEval.save();

        // 3. INICIAR PROCESO EN BACKGROUND (NO usamos await aquí para no bloquear)
        // Llamamos a la función pero NO esperamos su respuesta para el 'res.json'
        processGeminiAnalysis(newEval._id, userContextData).catch(err => {
            console.error("Error en background process:", err);
            // Si falla, actualizamos el estado a failed
            EvaluationControl.findByIdAndUpdate(newEval._id, { status: 'failed' }).exec();
        });

        // 4. RESPONDER RÁPIDO AL CLIENTE (Evita timeout de Heroku)
        return res.status(202).json({
            success: true,
            message: "Análisis iniciado. Por favor consulta el estado con el ID.",
            pollingId: newEval._id, // El cliente usará este ID para preguntar
            status: 'pending'
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ success: false, error: error.message });
    }
};

// ---------------------------------------------------------
// FUNCIÓN PRIVADA: PROCESAMIENTO DE IA (Corre en background)
// ---------------------------------------------------------
async function processGeminiAnalysis(evaluationId, data) {
    // Cambiamos estado a processing
    await EvaluationControl.findByIdAndUpdate(evaluationId, { status: 'processing' });

    try {
        // Tu lógica de Prompt
        const model = aiClient.getGenerativeModel({ model: "gemini-pro" });
        const prompt = `Actúa como entrenador experto. Analiza estos datos: ${JSON.stringify(data)}...`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        // GUARDAMOS EL RESULTADO EN LA BASE DE DATOS
        await EvaluationControl.findByIdAndUpdate(evaluationId, {
            status: 'completed',
            result: text, // Aquí queda guardado el análisis
            lastEvaluationDate: new Date()
        });
        console.log(`Evaluación ${evaluationId} completada exitosamente.`);

    } catch (error) {
        console.error(`Error procesando evaluación ${evaluationId}:`, error);
        await EvaluationControl.findByIdAndUpdate(evaluationId, { status: 'failed' });
    }
}

// ---------------------------------------------------------
// ENDPOINT 2: POLLING / CONSULTAR ESTADO (GET)
// ---------------------------------------------------------
exports.checkEvaluationStatus = async (req, res) => {
    try {
        const { pollingId } = req.params;
        const evaluation = await EvaluationControl.findById(pollingId);

        if (!evaluation) {
            return res.status(404).json({ success: false, message: "Evaluación no encontrada" });
        }

        if (evaluation.status === 'completed') {
            return res.status(200).json({
                success: true,
                status: 'completed',
                data: evaluation.result // ¡Aquí entregas el análisis final!
            });
        } else if (evaluation.status === 'failed') {
            return res.status(500).json({ success: false, status: 'failed', message: "La IA falló al procesar." });
        } else {
            // Sigue esperando (pending o processing)
            return res.status(200).json({
                success: true,
                status: evaluation.status,
                message: "Aún procesando..."
            });
        }

    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};
module.exports = {

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
