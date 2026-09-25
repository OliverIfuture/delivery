// models/trainingDayPhoto.js
//
// NUEVO — galería personal de fotos de "fondo del día" por entrenador (ver
// "Fondo del día" en PlanEditor.vue del front). No existía ninguna tabla
// para esto — antes la "subida a Firebase" era una simulación 100% local
// (usePhotoGallery.js guardaba una data-URL del navegador, nada persistía).
// `category` guarda el grupo muscular (mismo vocabulario que
// exercises.muscle_group) al que pertenece la foto, para que la IA
// (flexAssistantController.js) pueda elegir la foto correcta según el
// énfasis muscular de cada día generado.
const db = require('../config/config.js');

const TrainingDayPhoto = {};

TrainingDayPhoto.findByCompany = (id_company) => {
    return db.manyOrNone(
        'SELECT id, url, category, created_at FROM trainer_day_photos WHERE id_company = $1 ORDER BY created_at DESC',
        [id_company]
    );
};

TrainingDayPhoto.findByCompanyAndCategory = (id_company, category) => {
    return db.manyOrNone(
        'SELECT id, url, category FROM trainer_day_photos WHERE id_company = $1 AND category = $2 ORDER BY created_at DESC',
        [id_company, category]
    );
};

TrainingDayPhoto.create = ({ id_company, url, category }) => {
    return db.one(
        'INSERT INTO trainer_day_photos (id_company, url, category) VALUES ($1, $2, $3) RETURNING id, url, category, created_at',
        [id_company, url, category || 'General']
    );
};

TrainingDayPhoto.findById = (id) => {
    return db.oneOrNone('SELECT id, id_company, url, category FROM trainer_day_photos WHERE id = $1', [id]);
};

TrainingDayPhoto.delete = (id) => {
    return db.none('DELETE FROM trainer_day_photos WHERE id = $1', [id]);
};

module.exports = TrainingDayPhoto;
