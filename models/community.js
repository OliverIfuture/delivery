// models/community.js
//
// NUEVO — capa "Comunidad" para el panel Vue del entrenador. Reutiliza las
// tablas y funciones YA REALES de `post`/`likes_publish`/`coments_post`/
// `commentslikes_post`/`poll_votes` (ver models/product.js), a las que se
// les agregaron 4 columnas nuevas por migración aditiva:
// post_type, achievement_title, achievement_subtitle, created_at.
//
// OJO — el controlador de posts existente (Product.getPostAllV2 /
// createPostV2 en controllers/productsControllers.js) resuelve la
// "comunidad" (id_company) leyendo SOLO req.user.id_entrenador, sin caer a
// mi_store si viene vacío. Verificado con datos reales: un entrenador cuyo
// id_entrenador propio esté vacío vería la comunidad "1" (default) en vez
// de la suya. El resto de endpoints de gamificación ya más nuevos
// (getLeaderboard, getActiveGiveaway) SÍ usan el patrón correcto
// `id_entrenador || mi_store` — aquí se usa ese mismo patrón más robusto,
// sin tocar el código viejo.
const db = require('../config/config.js');

const Community = {};

// Mismo patrón CTE que Product.createPostV2 (post + fila-placeholder en
// likes_publish con useremail='0', que el resto de queries ya sabe
// filtrar) — pero además guarda post_type y el banner de logro.
Community.createPost = (data) => {
    const sql = `
        WITH rows AS (
            INSERT INTO post(
                id_user, description, image_post, id_company, poll_options, is_trainer,
                post_type, achievement_title, achievement_subtitle
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING id
        )
        INSERT INTO likes_publish(id_publish, username, useremail, id_user)
        SELECT id, '0', '0', '0' FROM rows
        RETURNING id_publish AS id
    `;
    return db.one(sql, [
        data.id_user,
        data.description || null,
        data.image_post || null,
        data.id_company,
        data.poll_options || null,
        !!data.is_trainer,
        data.post_type || 'general',
        data.achievement_title || null,
        data.achievement_subtitle || null
    ]);
};

// Mismo SELECT que Product.getPostAllV2 (mismos joins/subqueries de
// likes/votos/comentarios, ya probados) más las 4 columnas nuevas.
Community.getFeed = (id_user, id_company) => {
    const sql = `
        SELECT
            P.id, P.id_user, P.description, P.image_post, P.social, P.id_company,
            P.is_pinned, P.poll_options, P.is_trainer,
            P.post_type, P.achievement_title, P.achievement_subtitle, P.created_at,
            U.name, U.image AS photo,
            (SELECT COUNT(*) FROM poll_votes WHERE id_post = P.id) AS total_votes,
            (SELECT COUNT(*) FROM coments_post WHERE id_post = P.id) AS comments_count,
            (
                SELECT COALESCE(json_agg(json_build_object(
                    'id_user', pv.id_user, 'option_id', pv.option_id,
                    'user_photo', u2.image, 'user_name', u2.name
                )), '[]')
                FROM poll_votes pv INNER JOIN users u2 ON u2.id = pv.id_user
                WHERE pv.id_post = P.id
            ) AS votes_detail,
            (
                SELECT COALESCE(json_agg(json_build_object(
                    'id', lp.id, 'id_user', lp.id_user,
                    'username', u3.name, 'userImage', u3.image, 'useremail', lp.useremail
                )) FILTER (WHERE lp.useremail != '0'), '[]')
                FROM likes_publish lp INNER JOIN users u3 ON u3.id = lp.id_user
                WHERE lp.id_publish = P.id
            ) AS likespost
        FROM post AS P
        INNER JOIN users AS U ON U.id = P.id_user
        WHERE P.id_company::varchar = $2
          AND P.id NOT IN (SELECT post_id FROM reported_posts WHERE user_id = $1)
          AND P.id_user NOT IN (SELECT blocked_id FROM blocked_users WHERE blocker_id = $1)
          AND P.id_user NOT IN (SELECT blocker_id FROM blocked_users WHERE blocked_id = $1)
        GROUP BY P.id, U.name, U.image
        ORDER BY P.is_pinned DESC, P.id DESC
    `;
    return db.manyOrNone(sql, [id_user, id_company]);
};

Community.getPostById = (id_post) => {
    return db.oneOrNone(`SELECT id, id_user, id_company FROM post WHERE id = $1`, [id_post]);
};

Community.findUserLikeOnPost = (id_post, id_user) => {
    return db.oneOrNone(
        `SELECT id FROM likes_publish WHERE id_publish = $1 AND id_user = $2 AND useremail != '0' LIMIT 1`,
        [id_post, id_user]
    );
};

module.exports = Community;
