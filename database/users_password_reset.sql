-- Recuperación de contraseña: código aparte de session_token, con vencimiento.
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_reset_code VARCHAR(6) NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_reset_expires_at TIMESTAMP NULL;
