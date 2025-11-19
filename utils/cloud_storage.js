const { Storage } = require('@google-cloud/storage');
const { format } = require('util');
const env = require('../config/env')
const url = require('url');
const { v4: uuidv4 } = require('uuid');
const path = require('path'); // IMPORTANTE: Para manejar extensiones

const storage = new Storage({
    projectId: "premium-delivery-app",
    keyFilename: './serviceAccountKey.json'
});

const bucket = storage.bucket("gs://premium-delivery-app.appspot.com/");

/**
 * Subir el archivo a Firebase Storage
 * @param {File} file objeto que sera almacenado en Firebase Storage
 */
module.exports = (file, pathImage, deletePathImage) => {
    return new Promise((resolve, reject) => {
        
        const uuid = uuidv4();

        // --- Lógica de Borrado (Sin Cambios) ---
        if (deletePathImage) {
            if (deletePathImage != null || deletePathImage != undefined) {
                const parseDeletePathImage = url.parse(deletePathImage)
                var ulrDelete = parseDeletePathImage.pathname.slice(23);
                const fileDelete = bucket.file(`${ulrDelete}`)

                fileDelete.delete().then((imageDelete) => {
                    console.log('se borro la imagen con exito')
                }).catch(err => {
                    console.log('Failed to remove photo, error:', err)
                });
            }
        }

        if (pathImage) {
            if (pathImage != null || pathImage != undefined) {

                // **CORRECCIÓN 1: Asegurar la extensión en el nombre del archivo**
                // Si 'pathImage' no tiene extensión, se la agregamos basada en el archivo original.
                const fileExtension = path.extname(file.originalname); // ej: .jpg
                let finalPath = pathImage;
                
                // Si el pathImage que mandaste no termina con la extensión, agrégasela
                if (!pathImage.endsWith(fileExtension)) {
                     finalPath = `${pathImage}${fileExtension}`;
                }

                let fileUpload = bucket.file(`${finalPath}`);
                
                // **CORRECCIÓN 2: Usar el mimetype real del archivo**
                // Multer ya nos da el mimetype correcto (ej. 'image/jpeg', 'application/pdf')
                // No necesitamos adivinarlo.
                const mimeType = file.mimetype || 'application/octet-stream';

                console.log(`Subiendo a: ${finalPath} | Tipo: ${mimeType}`);

                const blobStream = fileUpload.createWriteStream({
                    metadata: {
                        contentType: mimeType, // <--- ESTO ES CLAVE para que el navegador sepa qué es
                        metadata: {
                            firebaseStorageDownloadTokens: uuid,
                        }
                    },
                    resumable: false
                });

                blobStream.on('error', (error) => {
                    console.log('Error al subir archivo a firebase', error);
                    reject('Something is wrong! Unable to upload at the moment.');
                });

                blobStream.on('finish', () => {
                    // Codificar el nombre del archivo para la URL (maneja espacios y caracteres raros)
                    const encodedFileName = encodeURIComponent(fileUpload.name); // fileUpload.name incluye la carpeta

                    // Construir la URL pública
                    const url = format(`https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodedFileName}?alt=media&token=${uuid}`);
                    
                    console.log('URL GENERADA:', url);
                    resolve(url);
                });

                blobStream.end(file.buffer);
            }
        }
    });
}
