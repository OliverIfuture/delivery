// models/tutorialVideos.js
//
// NUEVO — enlaces de YouTube de los botones "Ver video tutorial" del
// panel (Clientes, Plantillas, y los que se agreguen después), editables
// en caliente por Coach Community (ver controllers/tutorialVideosController.js)
// sin necesitar un deploy cada vez que cambie el video.
const db = require('../config/config.js');

const TutorialVideo = {};

TutorialVideo.getAll = () => {
    return db.manyOrNone('SELECT key, video_url FROM app_tutorial_videos');
};

TutorialVideo.upsert = (key, videoUrl) => {
    const sql = `
        INSERT INTO app_tutorial_videos (key, video_url, updated_at)
        VALUES ($1, $2, NOW())
        ON CONFLICT (key) DO UPDATE SET video_url = $2, updated_at = NOW()
    `;
    return db.none(sql, [key, videoUrl]);
};

module.exports = TutorialVideo;
