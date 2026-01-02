
const axios = require('axios'); // <--- ¡TE FALTA ESTA LÍNEA!
const ClientProgress = require('../models/clientProgress.js');
// Si no tienes un archivo de config separado, inicialízalo aquí:
const { GoogleGenAI } = require("@google/genai");
const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
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

            console.log(`[AI] Iniciando análisis de progreso para usuario ${req.user ? req.user.id : 'Desconocido'}...`);

            // 2. FUNCIÓN AUXILIAR PARA DESCARGAR IMÁGENES (Con Headers para evitar bloqueos)
            const urlToGenerativePart = async (url) => {
                try {
                    console.log(`[AI] Descargando: ${url.substring(0, 40)}...`);
                    const response = await axios.get(url, {
                        responseType: 'arraybuffer',
                        headers: { 'User-Agent': 'Mozilla/5.0 (NodeJS Axios)' }
                    });
                    return {
                        inlineData: {
                            data: Buffer.from(response.data).toString('base64'),
                            mimeType: response.headers['content-type'] || 'image/jpeg',
                        },
                    };
                } catch (error) {
                    console.error(`❌ Error descargando imagen: ${url}`);
                    throw new Error("No se pudo acceder a una de las imágenes. Verifica permisos.");
                }
            };

            // 3. PREPARAR DATOS (Descarga paralela)
            // Esto es equivalente a cuando procesabas el PDF file.buffer en tu ejemplo
            const [imagePartBefore, imagePartAfter] = await Promise.all([
                urlToGenerativePart(image_before),
                urlToGenerativePart(image_after)
            ]);

            // 4. PROMPT MAESTRO
            const promptText = `
                Actúa como 'GlowUp Coach', un entrenador personal experto, motivador y empático.
                
                Tienes dos imágenes de un cliente:
                1. La primera es el "ANTES".
                2. La segunda es el "AHORA" (Progreso actual).

                TU TAREA:
                Analiza visualmente la transformación física comparando ambas fotos.
                Identifica cambios positivos como: definición muscular, reducción de grasa, mejor postura, aumento de masa muscular, o simplemente constancia.

                REGLAS DE RESPUESTA:
                - Sé breve (máximo 3 líneas o 40 palabras).
                - Usa un tono MUY entusiasta y motivador.
                - Usa emojis (🔥, 💪, ✨, 🚀).
                - Háblale directamente al usuario ("¡Has logrado...", "Te ves...").
                - Si el cambio es sutil, felicítalo por la disciplina y la constancia.
                - NO des diagnósticos médicos ni uses lenguaje técnico aburrido.
                
                Responde SOLO con el texto del mensaje motivacional.
            `;

            // 5. LLAMADA A GEMINI (Estilo SDK Standard)
            // Usamos el modelo Flash para velocidad
            const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

            const result = await model.generateContent([
                promptText,
                imagePartBefore,
                imagePartAfter
            ]);

            const response = await result.response;

            // 6. PROCESAR RESPUESTA (Igual que en tu ejemplo)
            let text = response.text();

            if (!text) throw new Error("La IA no generó respuesta de texto.");

            // Limpieza básica por si acaso (aunque pedimos texto plano)
            text = text.replace(/```json/g, '').replace(/```/g, '').trim();

            console.log(`[AI] Análisis completado: ${text.substring(0, 30)}...`);

            // 7. RESPONDER AL CLIENTE
            return res.status(200).json({
                success: true,
                message: 'Análisis completado exitosamente',
                data: text // Enviamos el texto directo para mostrar en el Dialog
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
