const ClientProgress = require('../models/clientProgress.js');

module.exports = {

    /**
     * Guarda un registro de métricas (peso, grasa, etc.)
     */
async logMetric(req, res, next) {
        try {
            const metricLog = req.body;
            
            // Asignar IDs desde el token (más seguro)
            metricLog.id_client = req.user.id;
            
            // Asignamos el valor, que podría ser un ID, null, o una cadena "null"
            metricLog.id_company = req.user.id_entrenador;

            // 💡 VERIFICACIÓN ROBUSTA: Si es falsy (null, undefined, '') O la cadena "null"
            if (!metricLog.id_company || metricLog.id_company === 'null') {
                metricLog.id_company = null; // Asignar el valor JavaScript/SQL NULL
            }

            const data = await ClientProgress.logMetric(metricLog);
            
            return res.status(201).json({
                success: true,
                message: 'Métricas guardadas correctamente.',
                data: { 'id': data.id }
            });
        }
        catch (error) {
            console.log(`Error en clientProgressController.logMetric: ${error}`);
            // Manejar error de "llave duplicada" (unique constraint)
            if (error.code === '23505') {
                return res.status(409).json({
                    success: false,
                    message: 'Ya has registrado tus métricas para esta fecha. Intenta mañana.',
                    error: error.detail
                });
            }
            return res.status(501).json({
                success: false,
                message: 'Error al guardar las métricas',
                error: error
            });
        }
    },
    /**
     * Guarda la URL de una foto de progreso
     */
    async logPhoto(req, res, next) {
        try {
            const photoLog = req.body; // Debe contener { image_url, date_taken }

            // Asignar IDs desde el token
            photoLog.id_client = req.user.id;
            photoLog.id_company = req.user.id_entrenador;
            
            // 💡 VERIFICACIÓN ROBUSTA: Si es falsy (null, undefined, '') O la cadena "null"
            if (!photoLog.id_company || metricLog.id_company === 'null') {
                photoLog.id_company = null; // Asignar el valor JavaScript/SQL NULL
            }
            if (!photoLog.image_url) {
                return res.status(400).json({ success: false, message: 'No se recibió la URL de la imagen.' });
            }

            const data = await ClientProgress.logPhoto(photoLog);
            
            return res.status(201).json({
                success: true,
                message: 'Foto de progreso guardada.',
                data: { 'id': data.id }
            });
        }
        catch (error) {
            console.log(`Error en clientProgressController.logPhoto: ${error}`);
            return res.status(501).json({
                success: false,
                message: 'Error al guardar la foto de progreso',
                error: error
            });
        }
    },

    /**
     * Obtener historial de métricas de un cliente
     */
    async getMetrics(req, res, next) {
        try {
            const id_client = req.params.id_client;
            
            // Seguridad: (Opcional) Validar que el req.user (entrenador o cliente)
            // tenga permiso para ver este historial.
            
            const data = await ClientProgress.getMetrics(id_client);
            return res.status(200).json(data);
        }
        catch (error) {
            console.log(`Error en clientProgressController.getMetrics: ${error}`);
            return res.status(501).json({
                success: false,
                message: 'Error al obtener las métricas',
                error: error
            });
        }
    },

    /**
     * Obtener historial de fotos de un cliente
     */
    async getPhotos(req, res, next) {
        try {
            const id_client = req.params.id_client;
            const data = await ClientProgress.getPhotos(id_client);
            return res.status(200).json(data);
        }
        catch (error) {
            console.log(`Error en clientProgressController.getPhotos: ${error}`);
            return res.status(501).json({
                success: false,
                message: 'Error al obtener las fotos de progreso',
                error: error
            });
        }
    },
};
