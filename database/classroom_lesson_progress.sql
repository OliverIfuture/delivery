-- Progreso real de lecciones del Classroom (antes solo existía local, por
-- dispositivo, en Flutter vía SharedPreferences — ver
-- tab_products_controller.dart saveLessonProgress). Genérico por user_id,
-- no solo entrenadores: sirve para la pestaña "Cursos" de Coach Community
-- en el panel ahora, y queda listo si algún día Flutter también quiere
-- sincronizar progreso real en vez de solo local.
CREATE TABLE IF NOT EXISTS classroom_lesson_progress (
    id SERIAL PRIMARY KEY,
    id_user INTEGER NOT NULL,
    id_lesson INTEGER NOT NULL REFERENCES classroom_lessons(id) ON DELETE CASCADE,
    completed BOOLEAN NOT NULL DEFAULT false,
    completed_at TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE (id_user, id_lesson)
);

CREATE INDEX IF NOT EXISTS idx_classroom_lesson_progress_user ON classroom_lesson_progress (id_user);
