// controllers/tutorialVideosController.js
//
// NUEVO — ver models/tutorialVideos.js. getAll es de lectura libre (lo
// necesita cualquier entrenador para ver el video correcto); update está
// gateado por correo a Coach Community, igual que el resto de permisos
// de administración de esa cuenta (ver AUDIT_ADMIN_EMAIL en
// auditController.js, COACH_COMMUNITY_ADMIN_EMAIL en
// coachCommunityController.js).
const TutorialVideo = require('../models/tutorialVideos.js');

const TUTORIAL_ADMIN_EMAIL = 'coach.community@thetrainer-app.com';

function isTutorialAdmin(req) {
    return (req.user?.email || '').trim().toLowerCase() === TUTORIAL_ADMIN_EMAIL;
}

module.exports = {
    async getAll(req, res) {
        try {
            const rows = await TutorialVideo.getAll();
            const map = {};
            rows.forEach((r) => { map[r.key] = r.video_url; });
            return res.status(200).json({ success: true, data: map });
        } catch (error) {
            console.log(`Error en tutorialVideosController.getAll: ${error}`);
            return res.status(501).json({ success: false, message: 'Error al obtener los videos de tutorial' });
        }
    },

    async update(req, res) {
        if (!isTutorialAdmin(req)) {
            return res.status(403).json({ success: false, message: 'No tienes permiso para editar los tutoriales.' });
        }
        try {
            const { key, video_url } = req.body;
            if (!key) {
                return res.status(400).json({ success: false, message: 'Falta key.' });
            }
            await TutorialVideo.upsert(key, video_url || '');
            return res.status(200).json({ success: true, message: 'Enlace del tutorial actualizado.' });
        } catch (error) {
            console.log(`Error en tutorialVideosController.update: ${error}`);
            return res.status(501).json({ success: false, message: 'Error al actualizar el video del tutorial' });
        }
    }
};
