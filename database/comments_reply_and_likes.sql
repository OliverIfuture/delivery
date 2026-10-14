-- Respuestas anidadas (1 nivel) a comentarios de posts, y like en
-- comentarios. Aditiva: columna nullable nueva, no rompe nada de lo que ya
-- lee/escribe coments_post. commentsLikes_post YA existe y ya se lee en
-- Product.findPostComent; lo que faltaba era la columna de hilo y el
-- endpoint para escribir un like de comentario (ver communityController.js).
ALTER TABLE coments_post
    ADD COLUMN IF NOT EXISTS parent_comment_id INTEGER REFERENCES coments_post(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_coments_post_parent ON coments_post (parent_comment_id);
