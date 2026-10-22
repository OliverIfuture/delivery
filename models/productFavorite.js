// models/productFavorite.js
// Favoritos reales de producto (premium-supps-store, id_company=4 — pero
// la tabla es genérica, cualquier tienda que comparta `products` la puede
// usar). Nada que ver con las tablas `favorites`/`favorites_profile`/
// `favoritesproducts`/`user_favorite_recipes` ya existentes — esas son de
// recetas/dietas, un concepto completamente distinto.
const db = require('../config/config');

const ProductFavorite = {};

ProductFavorite.getByUser = (idUser) => {
    const sql = `
        SELECT p.*
        FROM pss_product_favorites f
        INNER JOIN products p ON p.id = f.id_product
        WHERE f.id_user = $1
        ORDER BY f.created_at DESC
    `;
    return db.manyOrNone(sql, [idUser]);
};

ProductFavorite.getIdsByUser = async (idUser) => {
    const rows = await db.manyOrNone('SELECT id_product FROM pss_product_favorites WHERE id_user = $1', [idUser]);
    return rows.map((r) => r.id_product);
};

// INSERT si no existía, DELETE si ya existía — regresa el nuevo estado.
ProductFavorite.toggle = async (idUser, idProduct) => {
    const existing = await db.oneOrNone(
        'SELECT id FROM pss_product_favorites WHERE id_user = $1 AND id_product = $2',
        [idUser, idProduct]
    );
    if (existing) {
        await db.none('DELETE FROM pss_product_favorites WHERE id = $1', [existing.id]);
        return { favorited: false };
    }
    await db.none('INSERT INTO pss_product_favorites(id_user, id_product) VALUES($1, $2)', [idUser, idProduct]);
    return { favorited: true };
};

module.exports = ProductFavorite;
