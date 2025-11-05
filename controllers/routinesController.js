const Routine = require('../models/routine.js');

module.exports = {

    /**
     * Crear una nueva rutina
     */
    async create(req, res, next) {
        try {
            const routine = req.body; // El objeto JSON completo
            // Asegurarnos que el id_company viene del token (más seguro)
            routine.id_company = req.user.mi_store; 

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
                error: error
            });
        }
    },

    /**
     * Actualizar una rutina (nombre, o el JSON del plan)
     */
    async update(req, res, next) {
        try {
            const routine = req.body;
            // Validar que el entrenador solo pueda editar sus propias rutinas
            routine.id_company = req.user.mi_store; 

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
            const id_company = req.user.mi_store; // ID del entrenador

            await Routine.delete(id_routine, id_company);
            
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
     * Activar una rutina (ej. Poner is_active = true)
     * Esto desactiva automáticamente cualquier otra rutina para ese cliente.
     */
    async setActive(req, res, next) {
        try {
            const id_routine = req.body.id_routine;
            const id_client = req.body.id_client;
            const id_company = req.user.mi_store; // ID del entrenador

            await Routine.setActive(id_routine, id_client, id_company);
            
            return res.status(200).json({
                success: true,
                message: 'Rutina activada para el cliente.'
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
            return res.status(501).json({
                success: false,
                message: 'Error al buscar rutinas por entrenador',
                error: error
            });
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
            return res.status(501).json({
                success: false,
                message: 'Error al buscar la rutina del cliente',
                error: error
            });
        }
    },

};
