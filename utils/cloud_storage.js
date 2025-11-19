const { Storage } = require('@google-cloud/storage');
const { format } = require('util');
const env = require('../config/env')
const url = require('url');
const { v4: uuidv4 } = require('uuid');

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
        
        const uuid = uuidv4(); // Generar token único

        console.log('delete path', deletePathImage)
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

                let fileUpload = bucket.file(`${pathImage}`);
                
                // **CORRECCIÓN: Detección robusta del tipo MIME**
                // Intentamos obtener el tipo del archivo de varias formas.
                // Si falla, y el nombre tiene extensión pdf, forzamos application/pdf.
                // Si no, fallback a image/png.
                let mimeType = file.mimetype;
                
                if (!mimeType && file.originalname) {
                    if (file.originalname.toLowerCase().endsWith('.pdf')) {
                        mimeType = 'application/pdf';
                    } else if (file.originalname.toLowerCase().endsWith('.jpg') || file.originalname.toLowerCase().endsWith('.jpeg')) {
                        mimeType = 'image/jpeg';
                    } else if (file.originalname.toLowerCase().endsWith('.gif')) {
                        mimeType = 'image/gif';
                    }
                }
                
                // Fallback final
                if (!mimeType) {
                    mimeType = 'image/png';
                }

                console.log(`Subiendo archivo: ${pathImage} con tipo: ${mimeType}`);

                const blobStream = fileUpload.createWriteStream({
                    metadata: {
                        contentType: mimeType, // <-- Usamos el tipo detectado
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
                    // Codificamos el nombre para la URL
                    const encodedFileName = encodeURIComponent(fileUpload.name);

                    const url = format(`https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodedFileName}?alt=media&token=${uuid}`);
                    
                    console.log('URL DE CLOUD STORAGE ', url);
                    resolve(url);
                });

                blobStream.end(file.buffer);
            }
        }
    });
}
