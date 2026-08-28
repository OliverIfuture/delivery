// controllers/emoonReviewsController.js
const EmoonReview = require('../models/emoonReview');

module.exports = {
    async getAll(req, res) {
        try {
            const data = await EmoonReview.getAll();
            return res.status(200).json({ success: true, data });
        } catch (error) {
            console.error('Error getAllReviews:', error);
            return res.status(500).json({ success: false, message: 'Error al obtener reseñas', error: error.message });
        }
    },

    async create(req, res) {
        try {
            const { userId, reviewerName, rating, comment } = req.body;
            if (!reviewerName || !rating) {
                return res.status(400).json({ success: false, message: 'Nombre y calificación son obligatorios.' });
            }

            const data = await EmoonReview.create(userId || null, reviewerName, rating, comment);
            return res.status(201).json({ success: true, message: 'Reseña registrada con éxito.', data });
        } catch (error) {
            console.error('Error createReview:', error);
            return res.status(500).json({ success: false, message: 'Error al crear reseña', error: error.message });
        }
    },

    async togglePublish(req, res) {
        try {
            const { id } = req.params;
            const { isPublished } = req.body;

            const data = await EmoonReview.togglePublish(id, isPublished);
            return res.status(200).json({ success: true, message: 'Estado actualizado.', data });
        } catch (error) {
            console.error('Error togglePublishReview:', error);
            return res.status(500).json({ success: false, message: 'Error al cambiar visibilidad', error: error.message });
        }
    }
};