
const axios = require('axios'); // <--- ¡TE FALTA ESTA LÍNEA!
const ClientProgress = require('../models/clientProgress.js');
// Si no tienes un archivo de config separado, inicialízalo aquí:
const { GoogleGenAI } = require("@google/genai");
const aiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
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


    async analyzeProgressAI(req, res, next) {
        try {
            // 1. VALIDACIÓN DE ENTRADA
            const { image_before, image_after } = req.body;

            if (!image_before || !image_after) {
                return res.status(400).json({
                    success: false,
                    message: 'Faltan las URLs de las imágenes (image_before, image_after).'
                });
            }

            console.log(`[AI] Iniciando análisis para usuario...`);

            // 2. FUNCIÓN AUXILIAR PARA DESCARGAR Y OBTENER BASE64
            const getBase64FromUrl = async (url) => {
                try {
                    console.log(`[AI] Descargando: ${url.substring(0, 40)}...`);
                    const response = await axios.get(url, {
                        responseType: 'arraybuffer',
                        headers: { 'User-Agent': 'Mozilla/5.0 (NodeJS Axios)' }
                    });

                    return {
                        mimeType: response.headers['content-type'] || 'image/jpeg',
                        data: Buffer.from(response.data).toString('base64')
                    };
                } catch (error) {
                    console.error(`❌ Error descargando imagen: ${url}`);
                    throw new Error("No se pudo acceder a una de las imágenes.");
                }
            };

            // 3. DESCARGAR IMÁGENES EN PARALELO
            const [imgDataBefore, imgDataAfter] = await Promise.all([
                getBase64FromUrl(image_before),
                getBase64FromUrl(image_after)
            ]);

            // 4. PROMPT MAESTRO
            const promptText = `
                atúa como un Analista Físico Deportivo Experto de la app GlowUp+.
                Tienes dos imágenes del mismo usuario: 1) ANTES, 2) AHORA.

                Realiza un ANÁLISIS TÉCNICO COMPARATIVO de los cambios físicos visibles.

                TU OBJETIVO ES IDENTIFICAR:
                1. Hipertrofia (Ganancia Muscular): ¿Qué grupos musculares se ven más llenos o grandes? (Hombros, pectorales, brazos, piernas).
                2. Definición (Pérdida de Grasa): Busca cortes musculares visibles, vascularidad, reducción de cintura y mayor visibilidad del abdomen.
                3. Postura y Estructura: Mejoras en la amplitud de espalda o simetría.

                REGLAS DE RESPUESTA:
                - ELIMINA el lenguaje motivacional vacío (ej: "¡Eres una inspiración!", "¡Sigue así!").
                - Sé DIRECTO y TÉCNICO.
                - Usa términos anatómicos (Deltoides, Pectoral mayor, Recto abdominal, Cuádriceps).
                - Ejemplo de tono deseado: "Se observa una notable reducción de tejido adiposo en la zona abdominal, revelando mayor definición en el recto abdominal. A su vez, hay mayor redondez en los deltoides y separación en el cuádriceps."
                - Máximo 4 líneas.
            `;

            // 5. LLAMADA A LA IA CON TU ESTRUCTURA SOLICITADA
            // Aquí inyectamos el texto Y las dos imágenes en el array 'parts'
            const response = await aiClient.models.generateContent({
                model: 'gemini-2.5-flash', // Usamos 1.5-flash (el estándar actual)
                contents: [
                    {
                        role: 'user',
                        parts: [
                            { text: promptText },
                            {
                                inlineData: {
                                    mimeType: imgDataBefore.mimeType,
                                    data: imgDataBefore.data
                                }
                            },
                            {
                                inlineData: {
                                    mimeType: imgDataAfter.mimeType,
                                    data: imgDataAfter.data
                                }
                            }
                        ]
                    }
                ]
            });

            // 6. PROCESAR RESPUESTA (Adaptado a la estructura de Vertex/Raw)
            let text = '';

            // Verificamos si response tiene candidates (estructura típica)
            if (response && response.candidates && response.candidates.length > 0) {
                const firstCandidate = response.candidates[0];
                if (firstCandidate.content && firstCandidate.content.parts && firstCandidate.content.parts.length > 0) {
                    text = firstCandidate.content.parts[0].text;
                }
            }
            // Fallback por si la estructura varía ligeramente según el cliente
            else if (response && response.text) {
                text = response.text;
            }

            if (!text) {
                console.error("Respuesta completa IA:", JSON.stringify(response, null, 2));
                throw new Error("La IA no generó respuesta de texto válida.");
            }

            // Limpieza
            text = text.replace(/```json/g, '').replace(/```/g, '').trim();

            console.log(`[AI] Análisis completado: ${text.substring(0, 30)}...`);

            // 7. RESPONDER AL CLIENTE
            return res.status(200).json({
                success: true,
                message: 'Análisis completado exitosamente',
                data: text
            });

        } catch (error) {
            console.error("Error en analyzeProgressAI:", error);
            return res.status(501).json({
                success: false,
                message: 'Error al analizar las imágenes con IA',
                error: error.message || error
            });
        }
    }
};
