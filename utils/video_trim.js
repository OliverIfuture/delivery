// utils/video_trim.js
//
// Recorta y comprime el video de un ejercicio antes de subirlo a Storage.
// Viene de un pedido explícito: el creador de ejercicios del panel ahora
// deja al entrenador recortar su clip en una línea de tiempo (máx. 30s) en
// vez de pedir una foto de portada aparte — esto hace real ese recorte
// (si solo lo aplicáramos en el frontend, el archivo pesado completo se
// subiría igual) y de paso comprime el video para que no suban clips
// pesadísimos grabados directo del celular.
//
// Usa ffmpeg-static (trae su propio binario, sin pedir un buildpack en
// Heroku) + fluent-ffmpeg. Si algo falla (archivo corrupto, códec raro,
// etc.) se resuelve con el buffer ORIGINAL sin tocar — mejor subir el
// video completo que romper la creación del ejercicio.
const fs = require('fs');
const os = require('os');
const path = require('path');
const { randomUUID } = require('crypto');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('ffmpeg-static');

ffmpeg.setFfmpegPath(ffmpegPath);

const MAX_DURATION_SECONDS = 30;

/**
 * @param {Buffer} inputBuffer video original, tal como llega de multer (memoria)
 * @param {{ start?: number, end?: number }} trim segundos dentro del video original
 * @returns {Promise<Buffer>} el video ya recortado (máx. 30s) y comprimido en mp4
 */
async function trimAndCompressVideo(inputBuffer, trim = {}) {
  const tmpDir = os.tmpdir();
  const id = randomUUID();
  const inputPath = path.join(tmpDir, `ex-in-${id}.mp4`);
  const outputPath = path.join(tmpDir, `ex-out-${id}.mp4`);

  let start = Number(trim.start);
  let end = Number(trim.end);
  if (!Number.isFinite(start) || start < 0) start = 0;
  if (!Number.isFinite(end) || end <= start) end = start + MAX_DURATION_SECONDS;
  const duration = Math.min(end - start, MAX_DURATION_SECONDS);

  try {
    await fs.promises.writeFile(inputPath, inputBuffer);

    await new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .setStartTime(start)
        .duration(duration)
        .outputOptions([
          '-vf', "scale='min(720,iw)':-2", // nunca sube la resolución, solo la topa en 720 de ancho
          '-c:v', 'libx264',
          '-preset', 'veryfast',
          '-crf', '28',
          '-movflags', '+faststart',
          '-c:a', 'aac',
          '-b:a', '96k'
        ])
        .output(outputPath)
        .on('end', resolve)
        .on('error', reject)
        .run();
    });

    const outputBuffer = await fs.promises.readFile(outputPath);
    console.log(`[video_trim] ${inputBuffer.length}B -> ${outputBuffer.length}B (recorte ${duration.toFixed(1)}s desde ${start.toFixed(1)}s)`);
    return outputBuffer;
  } catch (error) {
    console.log(`[video_trim] No se pudo recortar/comprimir, se sube el original: ${error.message || error}`);
    return inputBuffer;
  } finally {
    fs.promises.unlink(inputPath).catch(() => {});
    fs.promises.unlink(outputPath).catch(() => {});
  }
}

module.exports = { trimAndCompressVideo, MAX_DURATION_SECONDS };
