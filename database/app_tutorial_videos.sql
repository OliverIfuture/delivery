-- database/app_tutorial_videos.sql
--
-- Enlaces de YouTube de los botones "Ver video tutorial" del panel
-- (Clientes, Plantillas, y los que se agreguen después) — editables en
-- caliente por la cuenta de Coach Community, sin necesitar un deploy
-- cada vez que cambie el video. `key` identifica cada botón ('clients',
-- 'templates', etc.); si no hay fila para una key, el panel usa el
-- valor por defecto que trae en el código.
CREATE TABLE IF NOT EXISTS app_tutorial_videos (
    key TEXT PRIMARY KEY,
    video_url TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
