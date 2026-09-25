// controllers/photoGalleryController.js
//
// NUEVO — CRUD real y seguro de la galería de fotos "fondo del día" por
// entrenador (ver models/trainingDayPhoto.js). Sube el archivo a Firebase
// Storage (utils/cloud_storage.js, mismo helper ya usado por
// trainerModulesController.js) y guarda la URL pública + categoría
// (grupo muscular) en la tabla nueva. id_company sale siempre del JWT.
const TrainingDayPhoto = require('../models/trainingDayPhoto.js');
const storage = require('../utils/cloud_storage.js');

async function ownsPhoto(id, id_company) {
    const row = await TrainingDayPhoto.findById(id);
    return !!row && Number(row.id_company) === Number(id_company);
}

module.exports = {

    async getMyPhotos(req, res) {
        try {
            const id_company = req.user.mi_store;
            if (!id_company) return res.status(403).json({ success: false, message: 'Tu cuenta no tiene una empresa asignada.' });
            const photos = await TrainingDayPhoto.findByCompany(id_company);
            return res.status(200).json({ success: true, data: photos });
        } catch (error) {
            console.log(`Error en photoGalleryController.getMyPhotos: ${error}`);
            return res.status(501).json({ success: false, message: 'Error al obtener tu galería de fotos' });
        }
    },

    async uploadMyPhoto(req, res) {
        try {
            const id_company = req.user.mi_store;
            if (!id_company) return res.status(403).json({ success: false, message: 'Tu cuenta no tiene una empresa asignada.' });
            const file = req.files && req.files[0];
            if (!file) return res.status(400).json({ success: false, message: 'Falta la imagen.' });
            const category = (req.body.category || 'General').trim() || 'General';
            const url = await storage(file, `trainer_day_photos/company_${id_company}_${Date.now()}`);
            const created = await TrainingDayPhoto.create({ id_company, url, category });
            return res.status(201).json({ success: true, data: created });
        } catch (error) {
            console.log(`Error en photoGalleryController.uploadMyPhoto: ${error}`);
            return res.status(501).json({ success: false, message: 'Error al subir la foto' });
        }
    },

    async deleteMyPhoto(req, res) {
        try {
            const id_company = req.user.mi_store;
            const id = req.params.id;
            if (!(await ownsPhoto(id, id_company))) {
                return res.status(403).json({ success: false, message: 'Esa foto no es tuya.' });
            }
            await TrainingDayPhoto.delete(id);
            return res.status(200).json({ success: true, message: 'Foto eliminada.' });
        } catch (error) {
            console.log(`Error en photoGalleryController.deleteMyPhoto: ${error}`);
            return res.status(501).json({ success: false, message: 'Error al eliminar la foto' });
        }
    }

};
