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
            // 1. Validar que vengan los datos
            if (!req.body.exercise) {
                return res.status(400).json({
                    success: false,
                    message: 'Faltan los datos del ejercicio en la petición'
                });
            }

            // 2. Parsear datos
            const exercise = JSON.parse(req.body.exercise);

            if (req.user.mi_store == 4) {
                exercise.idCompany = null;
            } else {
                exercise.idCompany = req.user.mi_store;
            }

            // 3. --- EXTRACCIÓN DE ARCHIVOS (IMAGEN Y VIDEO) ---
            let imageFile = null;
            let videoFile = null;

            if (req.files) {
                if (req.files['image'] && req.files['image'].length > 0) {
                    imageFile = req.files['image'][0];
                }
                if (req.files['video'] && req.files['video'].length > 0) {
                    videoFile = req.files['video'][0];
                }
            }

            console.log(`Archivos detectados -> Video: ${videoFile ? 'SI' : 'NO'}, Imagen: ${imageFile ? 'SI' : 'NO'}`);

            // 4. --- SUBIDA A FIREBASE (STORAGE) ---

            // A) Subir Video (Si existe)
            if (videoFile) {
                const pathVideo = `exercises/videos/${Date.now()}`;
                const videoUrl = await storage(videoFile, pathVideo); // Asegúrate de tener importada tu función storage

                if (videoUrl) {
                    exercise.media_url = videoUrl;
                    exercise.media_type = 'video';
                }
            }

            // B) Subir Imagen / Portada (Si existe)
            if (imageFile) {
                const pathImage = `exercises/thumbnails/${Date.now()}`;
                const imageUrl = await storage(imageFile, pathImage);

                if (imageUrl) {
                    exercise.thumbnail_url = imageUrl;

                    // Si NO mandaron video, la imagen asume el rol principal
                    if (!videoFile) {
                        exercise.media_url = imageUrl;
                        exercise.media_type = 'image';
                    }
                }
            }

            // Fallback por si no envían nada
            if (!exercise.media_type) {
                exercise.media_type = 'none';
            }

            // 5. --- GUARDAR EN BASE DE DATOS ---
            const data = await Exercise.create(exercise);

            return res.status(201).json({
                success: true,
                message: 'Ejercicio creado correctamente',
                data: data.id
            });

        } catch (error) {
            console.log(`Error en exercisesController.create: ${error}`);
            return res.status(501).json({
                success: false,
                message: 'Error al crear el ejercicio',
                error: error.message || error
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
