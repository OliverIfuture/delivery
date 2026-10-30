-- database/emoon_stripe_connect.sql
--
-- Stripe Connect real para Emoon — una sola cuenta Express del estudio
-- (fila única, igual que casaforma_stripe_connect), puerto 1:1 del
-- patrón de Casa Forma. El estudio YA tiene una cuenta Express real
-- creada (acct_1UC7CZFbEbeuW30V, guardada hoy en
-- emoon.emoon_settings.stripe_account_id sin ningún otro dato ni
-- backend que la use) — este script crea la tabla dedicada y migra ese
-- valor ya existente para no perderlo ni crear una cuenta duplicada.
--
-- Seguro de correr más de una vez (CREATE TABLE IF NOT EXISTS + el
-- UPDATE de abajo solo corre si la tabla está recién creada / vacía).

CREATE TABLE IF NOT EXISTS emoon.emoon_stripe_connect (
    id INT PRIMARY KEY DEFAULT 1,
    status VARCHAR(20) NOT NULL DEFAULT 'not_connected', -- not_connected | pending | active
    stripe_account_id VARCHAR(120) NULL,
    charges_enabled BOOLEAN NOT NULL DEFAULT false,
    details_submitted BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT emoon_stripe_connect_single_row CHECK (id = 1)
);

-- Migra el account_id que ya existía en emoon_settings (si la fila
-- recién se creó, con status 'not_connected' default). El estado real
-- (charges_enabled/details_submitted) se corrige después con una
-- llamada real a Stripe vía PUT /api/emoon/stripe-connect/refresh, no
-- aquí (este script no debe llamar a la API de Stripe).
INSERT INTO emoon.emoon_stripe_connect (id, status, stripe_account_id)
SELECT 1, 'pending', s.stripe_account_id
FROM emoon.emoon_settings s
WHERE s.id = 1 AND s.stripe_account_id IS NOT NULL
ON CONFLICT (id) DO NOTHING;
