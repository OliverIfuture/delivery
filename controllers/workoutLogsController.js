const WorkoutLog = require('../models/workoutLog.js');

module.exports = {

    /**
     * Crear un nuevo registro (un set completado)
     */
    async create(req, res, next) {
        try {
            const log = req.body; // El objeto JSON completo del log
            
            // Asegurarnos que el id_client viene del token (más seguro)
            log.id_client = req.user.id; 
            // Asegurarnos que el id_company viene del entrenador asignado
            log.id_company = req.user.id_entrenador;

            if (!log.id_company) {
                 return res.status(400).json({
                    success: false,
                    message: 'Este usuario no está asignado a un entrenador.'
                });
            }

            const data = await WorkoutLog.create(log);
            
            return res.status(201).json({
                success: true,
                message: 'El progreso se ha guardado correctamente.',
                data: { 'id': data.id }
            });
        }
        catch (error) {
            console.log(`Error en workoutLogsController.create: ${error}`);
            return res.status(501).json({
                success: false,
                message: 'Error al guardar el progreso',
                error: error
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
            
            // Seguridad: Asegurar que el usuario solo pide su propio historial
            if (req.user.id != id_client) {
                 return res.status(403).json({ // 403 Forbidden
                    success: false,
                    message: 'No tienes permiso para ver este historial.'
                });
            }

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

};
