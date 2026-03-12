
const axios = require('axios'); // <--- AGREGADO (Necesario para descargar fotos)
const ClientProgress = require('../models/clientProgress.js');
// USAMOS LA LIBRERÍA ESTABLE (La misma que en DietController)
const { GoogleGenerativeAI } = require("@google/generative-ai");
const aiClient = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
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


    /**
     * Analiza dos fotos (Antes y Después) usando Gemini Vision
     * Recibe: { "image_before": "url...", "image_after": "url..." }
     */


    /**
     * Guarda la URL de una foto de progreso DESDE LA APP (Incluye el ángulo)
     */
    async logPhotoUserApp(req, res, next) {
        try {
            // Debe contener { image_url, date_taken, angle }
            const photoLog = req.body;

            // Asignar IDs desde el token
            photoLog.id_client = req.user.id;
            photoLog.id_company = req.user.id_entrenador;

            // 💡 VERIFICACIÓN ROBUSTA: Si es falsy (null, undefined, '') O la cadena "null"
            if (!photoLog.id_company || photoLog.id_company === 'null') {
                photoLog.id_company = null;
            }

            if (!photoLog.image_url) {
                return res.status(400).json({ success: false, message: 'No se recibió la URL de la imagen.' });
            }

            // Validar que sí venga el ángulo
            if (!photoLog.angle) {
                return res.status(400).json({ success: false, message: 'No se recibió el ángulo de la foto.' });
            }

            // Llamamos a la nueva función del modelo
            const data = await ClientProgress.logPhotoUserApp(photoLog);

            return res.status(201).json({
                success: true,
                message: `Foto ${photoLog.angle} guardada con éxito.`,
                data: { 'id': data.id }
            });
        }
        catch (error) {
            console.log(`Error en clientProgressController.logPhotoUserApp: ${error}`);
            return res.status(501).json({
                success: false,
                message: 'Error al guardar la foto de progreso',
                error: error
            });
        }
    },

    async analyzeProgressAI(req, res, next) {
        try {
            // 1. VALIDACIÓN
            const { image_before, image_after } = req.body;

            if (!image_before || !image_after) {
                return res.status(400).json({
                    success: false,
                    message: 'Faltan las URLs (image_before, image_after).'
                });
            }

            console.log(`[AI] Iniciando análisis comparativo...`);

            // 2. DESCARGAR IMÁGENES (Helper interno)
            const getBase64FromUrl = async (url) => {
                try {
                    const response = await axios.get(url, {
                        responseType: 'arraybuffer',
                        headers: { 'User-Agent': 'NodeJS Axios' }
                    });
                    return {
                        mimeType: response.headers['content-type'] || 'image/jpeg',
                        data: Buffer.from(response.data).toString('base64')
                    };
                } catch (error) {
                    console.error(`❌ Error descargando: ${url}`);
                    throw new Error("No se pudo acceder a las imágenes.");
                }
            };

            const [imgDataBefore, imgDataAfter] = await Promise.all([
                getBase64FromUrl(image_before),
                getBase64FromUrl(image_after)
            ]);

            // 3. PROMPT
            const promptText = `
                Actúa como un Analista Físico Deportivo Experto.
                Comparando la imagen 1 (ANTES) con la imagen 2 (AHORA):

                IDENTIFICA:
                1. Hipertrofia: ¿Qué músculos se ven más grandes?
                2. Definición: ¿Dónde hay menos grasa visible (abdomen, cortes)?
                3. Postura: Mejoras estructurales.

                REGLAS:
                - Sé TÉCNICO y DIRECTO (Usa anatomía real).
                - Nada de motivación vacía.
                - Máximo 4 líneas.
            `;

            // 4. LLAMADA A LA API (SINTAXIS LIBRERÍA ESTABLE)
            // Usamos 'gemini-1.5-flash' porque es la versión multimodal estable actual
            const model = aiClient.getGenerativeModel({ model: "gemini-2.5-pro" });

            const result = await model.generateContent([
                promptText,
                { inlineData: { mimeType: imgDataBefore.mimeType, data: imgDataBefore.data } },
                { inlineData: { mimeType: imgDataAfter.mimeType, data: imgDataAfter.data } }
            ]);

            const response = await result.response;
            const text = response.text();

            if (!text) throw new Error("La IA no generó texto.");

            console.log(`[AI] Análisis completado.`);

            // 5. RESPONDER
            return res.status(200).json({
                success: true,
                message: 'Análisis completado',
                data: text
            });

        } catch (error) {
            console.error("Error en analyzeProgressAI:", error);
            return res.status(501).json({
                success: false,
                message: 'Error al analizar imágenes',
                error: error.message || error
            });
        }
    }
};
