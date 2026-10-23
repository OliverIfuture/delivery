// controllers/reviewController.js
const Review = require('../models/review');
const storage = require('../utils/cloud_storage.js');

module.exports = {
    // Público — widget de reseñas en Home.
    async getByCompany(req, res) {
        try {
            const idCompany = req.params.id;
            const [reviews, summary] = await Promise.all([
                Review.getPublishedByCompany(idCompany),
                Review.getSummaryByCompany(idCompany)
            ]);
            return res.status(200).json({ success: true, data: { reviews, summary } });
        } catch (error) {
            console.log(`Error en reviewController.getByCompany: ${error}`);
            return res.status(500).json({ success: false, message: 'No se pudieron obtener las reseñas.' });
        }
    },

    // Público — para saber si ya calificó ESE pedido (mostrar u ocultar el
    // prompt de "deja tu reseña y gana el doble de puntos").
    async hasReviewedOrder(req, res) {
        try {
            const reviewed = await Review.hasReviewedOrder(req.params.id_order);
            return res.status(200).json({ success: true, data: { reviewed } });
        } catch (error) {
            return res.status(500).json({ success: false, message: error.message });
        }
    },

    // JWT — crea la reseña. multipart/form-data (foto opcional vía multer,
    // campo "photo"). id_order es opcional; si viene y le pertenece al
    // cliente, se otorga el bono de puntos (ver Review.create).
    async create(req, res) {
        try {
            const { id_company, id_order, rating, comment } = req.body;
            const ratingNum = Number(rating);
            if (!id_company || !ratingNum || ratingNum < 1 || ratingNum > 5) {
                return res.status(400).json({ success: false, message: 'Falta id_company o la calificación no es válida (1-5).' });
            }

            let photoUrl = null;
            if (req.files && req.files.photo && req.files.photo.length > 0) {
                photoUrl = await storage(req.files.photo[0], `review_photo_${Date.now()}`);
            }

            const reviewerName = [req.user.name, req.user.lastname].filter(Boolean).join(' ') || 'Cliente';

            const { review, bonusPoints } = await Review.create({
                idCompany: id_company,
                idUser: req.user.id,
                idOrder: id_order || null,
                reviewerName,
                reviewerImage: req.user.image || null,
                rating: ratingNum,
                comment,
                photoUrl
            });

            return res.status(201).json({
                success: true,
                message: bonusPoints > 0 ? `¡Gracias! Ganaste ${bonusPoints} puntos extra.` : '¡Gracias por tu reseña!',
                data: { review, bonusPoints }
            });
        } catch (error) {
            // UNIQUE(id_order) — ya se había calificado ese pedido.
            if (error.code === '23505') {
                return res.status(409).json({ success: false, message: 'Ya dejaste una reseña para este pedido.' });
            }
            console.log(`Error en reviewController.create: ${error}`);
            return res.status(500).json({ success: false, message: 'No se pudo guardar tu reseña.' });
        }
    }
};
