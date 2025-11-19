const Exercise = require('../models/exercise');
const storage = require('../utils/cloud_storage'); // Asumiendo que usas cloud_storage.js
const asyncForEach = require('../utils/async_foreach');

module.exports = {

    /**
     * Obtiene todos los ejercicios de una compañía (entrenador)
     */
    async findByCompany(req, res, next) {
        try {
            const id_company = req.params.id_company;
            const data = await Exercise.findByCompany(id_company);
            console.log(`Ejercicios para compañía ${id_company}: ${data.length}`);
            return res.status(200).json(data);
        } 
        catch (error) {
            console.log(`Error en exercisesController.findByCompany: ${error}`);
            return res.status(501).json({
                success: false,
                message: 'Error al obtener los ejercicios de la compañía',
                error: error
            });
        }
    },

    /**
     * Crea un nuevo ejercicio, subiendo una imagen si existe.
     */
async create(req, res, next) {
        try {
            // 1. Parsear los datos
            const exercise = JSON.parse(req.body.exercise);
            console.log(`Datos enviados del usuario: ${JSON.stringify(exercise)}`);

            // Asignar ID de la compañía del usuario logueado
            exercise.idCompany = req.user.mi_store; 

            // 2. Manejo del Archivo (Validación Segura)
            const files = req.files;

            // --- CORRECCIÓN AQUÍ: Validar que 'files' exista antes de leer 'length' ---
            if (files && files.length > 0) {
                
                const pathImage = `exercises/${Date.now()}`; 
                const url = await storage(files[0], pathImage);

                if (url != undefined && url != null) {
                    exercise.media_url = url; 
                }
                
                // Guardar el tipo de medio
                const mimeType = files[0].mimetype;
                if (mimeType.startsWith('image/')) {
                    exercise.media_type = 'image';
                } else if (mimeType.startsWith('video/')) {
                    exercise.media_type = 'video';
                } else if (mimeType === 'application/pdf') {
                    exercise.media_type = 'pdf';
                }
            }
            // -----------------------------------------------------------------------

            if (!exercise.idCompany) {
                return res.status(400).json({
                    success: false,
                    message: 'No se pudo identificar la compañía.'
                });
            }

            const data = await Exercise.create(exercise);

            return res.status(201).json({
                success: true,
                message: 'Ejercicio creado correctamente',
                data: data.id
            });

        } catch (error) {
            console.log(`Error: ${error}`);
            return res.status(501).json({
                success: false,
                message: 'Error al crear el ejercicio',
                error: error
            });
        }
    },
        async delete(req, res, next) {
        try {
            const id = req.params.id;
            await Exercise.delete(id);
            
            return res.status(200).json({
                success: true,
                message: 'Ejercicio eliminado con éxito'
            });

        } catch (error) {
            console.log(`Error en exercisesController.delete: ${error}`);
            return res.status(501).json({
                success: false,
                message: 'Hubo un error al eliminar el ejercicio',
                error: error
            });
        }
    },


    /**
     * NUEVO: Obtener solo ejercicios globales
     */
    async getGlobal(req, res, next) {
        try {
            const data = await Exercise.getGlobalExercises();
            return res.status(201).json(data);
        }
        catch (error) {
            console.log(`Error en getGlobal: ${error}`);
            return res.status(501).json({
                success: false,
                message: 'Error al obtener ejercicios globales',
                error: error
            });
        }
    },

       async update(req, res, next) {
        try {
            const exercise = req.body;
            await Exercise.update(exercise);
            return res.status(201).json({ success: true, message: 'El ejercicio se actualizo correctamente' });
        }
        catch (error) {
            console.log(`Error: ${error}`);
            return res.status(501).json({ success: false, message: 'Hubo un error al actualizar el ejercicio', error: error });
        }
    },
};
