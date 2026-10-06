-- Comentarios por ejercicio al terminar una rutina (cliente -> entrenador).
-- Aditiva y segura: solo agrega una columna nullable.
-- Ejecutar una vez en la base de producción antes de desplegar el backend
-- (si no existe la columna, el INSERT de workout_session_logs falla).
ALTER TABLE workout_session_logs
    ADD COLUMN IF NOT EXISTS exercise_feedback JSONB;
