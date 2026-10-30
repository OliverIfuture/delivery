-- database/emoon_password_reset.sql
--
-- Reset de contraseña por OTP para Emoon — puerto 1:1 del patrón de
-- Casa Forma (database/users_password_reset.sql / casaforma_schema.sql).
-- Emoon no tiene nada de esto hoy. Columnas nullable, no afecta ninguna
-- fila existente. Seguro de correr más de una vez (IF NOT EXISTS).

ALTER TABLE emoon.emoon_users
    ADD COLUMN IF NOT EXISTS password_reset_code VARCHAR(6) NULL,
    ADD COLUMN IF NOT EXISTS password_reset_expires_at TIMESTAMP NULL;
