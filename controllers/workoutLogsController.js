const WorkoutLog = require('../models/workoutLog.js');
const User = require('../models/user.js'); 

module.exports = {

    /**
     * Crear un nuevo registro (un set completado)
     */
    async create(req, res, next) {
        try {
            const log = req.body; 
            log.id_client = req.user.id; 
            
            // --- CORRECCIÓN FREEMIUM ---
            // Si tiene entrenador, lo usamos. Si no, se queda en null.
            // Y lo más importante: ¡QUITAMOS EL IF QUE BLOQUEABA!
            log.id_company = req.user.id_entrenador || null; 
            // ---------------------------

            const data = await WorkoutLog.create(log);
            // 2. **NUEVO: Actualizar la Racha**
            // No necesitamos esperar el resultado para responder al cliente,
            // pero es bueno saber si funcionó.
            const streakData = await User.updateStreak(log.id_client);
            console.log(`🔥 Racha actualizada para usuario ${log.id_client}: ${streakData.current_streak} días`);
            
            return res.status(201).json({
                success: true,
                message: 'Progreso registrado correctamente.',
                data: { 'id': data.id }
            });
        }
        catch (error) {
            console.log(`Error en workoutLogsController.create: ${error}`);
            return res.status(501).json({
                success: false,
                message: 'Error al guardar el progreso',
                error: error.message || error
            });
        }
    },
    /**
     * Obtener el historial de un ejercicio para un cliente
     */
    async getHistoryByExercise(req, res, next) {
        try {
            const id_client = req.params.id_client;
            const exercise_name = req.params.exercise_name;
            
            // Seguridad: Asegurar que el usuario (entrenador) pide el de su cliente
            // O que el cliente pide el suyo
            // (Esta lógica puede mejorarse, pero por ahora funciona)
            const data = await WorkoutLog.getHistoryByExercise(id_client, exercise_name);
            return res.status(200).json(data);
        }
        catch (error) {
            console.log(`Error en workoutLogsController.getHistoryByExercise: ${error}`);
            return res.status(501).json({
                success: false,
                message: 'Error al obtener el historial del ejercicio',
                error: error
            });
        }
    },
    
    /**
     * Obtener todos los logs de una rutina
     */
    async findByRoutine(req, res, next) {
        try {
            const id_routine = req.params.id_routine;
            const data = await WorkoutLog.findByRoutine(id_routine);
            return res.status(200).json(data);
        }
        catch (error) {
            console.log(`Error en workoutLogsController.findByRoutine: ${error}`);
            return res.status(501).json({
                success: false,
                message: 'Error al buscar los registros de la rutina',
                error: error
            });
        }
    },

    /**
     * **NUEVA FUNCIÓN: Obtener todo el historial de un cliente**
     */
    async findByClient(req, res, next) {
        try {
            const id_client = req.params.id_client;
            
            // Aquí deberíamos validar que el req.user (entrenador)
            // tenga permiso para ver este id_client.
            
            const data = await WorkoutLog.findByClient(id_client);
            return res.status(200).json(data);
        }
        catch (error) {
            console.log(`Error en workoutLogsController.findByClient: ${error}`);
            return res.status(501).json({
                success: false,
                message: 'Error al buscar el historial del cliente',
                error: error
            });
        }
    },


    async findLogsForCurrentRoutine(req, res, next) {
        try {
            const id_client = req.params.id_client;
            // CRÍTICO: Obtenemos el ID de la rutina de los query parameters
            const id_routine = req.params.idRoutine; 

            if (!id_routine) {
                return res.status(400).json({
                    success: false,
                    message: 'Falta el parámetro id_routine.'
                });
            }
            
            // Llama a la función del modelo filtrada por la fecha de hoy
            const data = await WorkoutLog.findByClientAndRoutineToday(id_client, id_routine);
            console.log(`logs del dia: ${JSON.stringify(data)}`);

            return res.status(200).json(data);
        }
        catch (error) {
            console.log(`Error en workoutLogsController.findByClient: ${error}`);
            return res.status(501).json({
                success: false,
                message: 'Error al buscar el historial del cliente',
                error: error.message
            });
        }
    },

    async getTrainerFeed(req, res, next) {
        try {
            // Seguridad: Asegura que el entrenador solo pueda ver su propio feed
            const id_company = req.user.mi_store; 
            
            if (req.params.id_company != id_company) {
                 return res.status(403).json({
                    success: false,
                    message: 'No tienes permiso para ver este feed.'
                });
            }

            const data = await WorkoutLog.getTrainerFeed(id_company);
            return res.status(200).json(data);
        }
        catch (error) {
            console.log(`Error en workoutLogsController.getTrainerFeed: ${error}`);
            return res.status(501).json({
                success: false,
                message: 'Error al obtener el feed de actividad',
                error: error
            });
        }
    },

};
