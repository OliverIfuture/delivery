// models/review.js
// Reseñas reales de premium-supps-store (tabla pss_reviews, genérica por
// id_company). Cada reseña se liga opcionalmente a UN pedido (id_order
// UNIQUE) — así se puede ofrecer el bono de puntos por calificar esa
// compra específica sin que alguien lo repita infinitas veces con el
// mismo pedido.
const db = require('../config/config');

const Review = {};

Review.getPublishedByCompany = (idCompany, limit = 30) => {
    const sql = `
        SELECT id, reviewer_name, reviewer_image, rating, comment, photo_url, created_at
        FROM pss_reviews
        WHERE id_company = $1 AND is_published = true
        ORDER BY created_at DESC
        LIMIT $2
    `;
    return db.manyOrNone(sql, [idCompany, limit]);
};

Review.getSummaryByCompany = async (idCompany) => {
    const row = await db.one(
        `SELECT COUNT(*)::int AS total, COALESCE(AVG(rating), 0)::float AS average
         FROM pss_reviews WHERE id_company = $1 AND is_published = true`,
        [idCompany]
    );
    return { total: row.total, average: Math.round(row.average * 10) / 10 };
};

Review.hasReviewedOrder = async (idOrder) => {
    const row = await db.oneOrNone('SELECT id FROM pss_reviews WHERE id_order = $1', [idOrder]);
    return !!row;
};

// Crea la reseña y, si viene ligada a un pedido real del mismo cliente,
// otorga el bono de puntos (mismos puntos que ya ganó ese pedido al
// pagarse, efectivamente duplicándolos) — todo en una transacción, y el
// UNIQUE de id_order evita que un pedido reciba el bono dos veces aunque
// dos solicitudes lleguen casi al mismo tiempo.
Review.create = ({ idCompany, idUser, idOrder, reviewerName, reviewerImage, rating, comment, photoUrl }) => {
    return db.tx(async (t) => {
        let bonusPoints = 0;

        if (idOrder) {
            const order = await t.oneOrNone('SELECT id, total, id_client FROM orders WHERE id = $1', [idOrder]);
            if (order && String(order.id_client) === String(idUser)) {
                bonusPoints = Math.floor(Number(order.total) / 10);
            }
        }

        const review = await t.one(
            `INSERT INTO pss_reviews(id_company, id_user, id_order, reviewer_name, reviewer_image, rating, comment, photo_url)
             VALUES($1, $2, $3, $4, $5, $6, $7, $8)
             RETURNING *`,
            [idCompany, idUser, idOrder || null, reviewerName, reviewerImage, rating, comment || null, photoUrl || null]
        );

        if (bonusPoints > 0) {
            await t.none(
                `UPDATE users SET balance = COALESCE(balance, 0) + $2 WHERE id = $1`,
                [idUser, bonusPoints]
            );
        }

        return { review, bonusPoints };
    });
};

module.exports = Review;
