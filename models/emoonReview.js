// models/emoonReview.js
const db = require('../config/config');

const EmoonReview = {};

// Obtener todas las reseñas para el Dashboard Admin
EmoonReview.getAll = async () => {
    const sql = `
        SELECT 
            r.id, 
            r.user_id, 
            r.reviewer_name, 
            r.rating, 
            r.comment, 
            r.is_published, 
            r.created_at,
            u.email AS user_email
        FROM emoon.emoon_reviews r
        LEFT JOIN emoon.emoon_users u ON r.user_id = u.id
        ORDER BY r.created_at DESC;
    `;
    return db.manyOrNone(sql);
};

// Crear una reseña
EmoonReview.create = async (userId, reviewerName, rating, comment) => {
    const sql = `
        INSERT INTO emoon.emoon_reviews(user_id, reviewer_name, rating, comment, is_published)
        VALUES($1, $2, $3, $4, true) 
        RETURNING *;
    `;
    return db.oneOrNone(sql, [userId, reviewerName, rating, comment]);
};

// Cambiar visibilidad (Publicar / Ocultar)
EmoonReview.togglePublish = async (id, isPublished) => {
    const sql = `
        UPDATE emoon.emoon_reviews
        SET is_published = $1
        WHERE id = $2
        RETURNING *;
    `;
    return db.oneOrNone(sql, [isPublished, id]);
};

module.exports = EmoonReview;