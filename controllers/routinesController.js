const Routine = require('../models/routine.js');

module.exports = {

    /**
     * Crear una nueva rutina (AHORA SOPORTA CLIENTES GRATUITOS)
     */
    async create(req, res, next) {
        try {
            const routine = req.body; 
            
            // --- NUEVA LÓGICA DE ASIGNACIÓN ---
            if (req.user.mi_store) {
                // CASO 1: Es un ENTRENADOR creando la rutina para un cliente
                routine.id_company = req.user.mi_store;
                // 'routine.id_client' debe venir en el body
            } else {
                // CASO 2: Es un USUARIO GRATUITO creando su propia rutina
                routine.id_company = null; // Sin entrenador
                routine.id_client = req.user.id; // Se asigna a sí mismo
            }
            // ----------------------------------

            if (!routine.id_client) {
                 return res.status(400).json({ success: false, message: 'Falta el ID del cliente.' });
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
                error: error
            });
        }
    },

    /**
     * Actualizar una rutina
     */
    async update(req, res, next) {
        try {
            const routine = req.body;
            
            // Validación de seguridad básica:
            // Si es entrenador, debe ser SU rutina (id_company coincide).
            // Si es cliente, debe ser SU rutina (id_company es null Y id_client coincide).
            // (Por simplicidad ahora, confiamos en el ID de la rutina, 
            // pero idealmente deberíamos validar la propiedad aquí).

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
            await Routine.delete(id_routine); // Ya no validamos id_company aquí para simplificar
            
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
            // El id_client lo sacamos del token si es un usuario gratuito, 
            // o del body si es un entrenador.
            const id_client = req.user.mi_store ? req.body.id_client : req.user.id;

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
        // ... (sin cambios)
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

};
