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
        
        let exercise;
        try {
            // El objeto 'exercise' viene como un string JSON en el body
            exercise = JSON.parse(req.body.exercise);
        } catch (e) {
            console.log(`Error parseando ejercicio: ${e}`);
            return res.status(400).json({
                success: false,
                message: 'El JSON del ejercicio no es válido',
                error: e
            });
        }

        const files = req.files;

        try {
            // Manejo de la imagen
            if (req.file) {
                console.log('Archivo de imagen recibido, subiendo a Firebase...');
                // Sube el archivo a Firebase Storage
                const data = await storage(req.file, 'exercise_images');
                if (data && data.url) {
                    exercise.media_url = data.url; // Asigna la URL de la imagen
                    exercise.media_type = 'image';
                }
            }
            
            // Llama al modelo para insertar en la BD
            const exerciseId = await Exercise.create(exercise);
            exercise.id = exerciseId; // Asigna el ID devuelto por la BD

            return res.status(201).json({
                success: true,
                message: 'Ejercicio creado correctamente',
                data: exercise // Devuelve el ejercicio completo con su nuevo ID y URL
            });

        } 
        catch (error) {
            console.log(`Error en exercisesController.create: ${error}`);
            return res.status(501).json({
                success: false,
                message: 'Error al crear el ejercicio',
                error: error
            });
        }
    },

    // Aquí irían las funciones async update() y async delete()

};
