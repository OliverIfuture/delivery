-- database/emoon_packages_domiciliation.sql
--
-- Domiciliación (cargo recurrente automático) para Emoon — hasta ahora
-- todos los paquetes de Emoon son de pago único. Esto agrega la
-- capacidad de marcar un paquete como domiciliado SIN tocar ninguna fila
-- existente: is_domiciliado default false, billing_cycle_days/
-- stripe_product_id/stripe_price_id nullable. Ningún paquete ya creado
-- cambia de comportamiento.
--
-- A diferencia de Casa Forma (Stripe Connect, una cuenta Express por
-- club), Emoon no usa Connect — todo pasa por la cuenta Stripe principal,
-- así que aquí no hace falta nada de "stripe_connect" ni comisión de
-- plataforma; stripe_subscription_id vive directo en la suscripción de la
-- cuenta principal.
--
-- Seguro de correr más de una vez (todo con IF NOT EXISTS).

ALTER TABLE emoon.emoon_packages
    ADD COLUMN IF NOT EXISTS is_domiciliado BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS billing_cycle_days INT NULL,
    ADD COLUMN IF NOT EXISTS stripe_product_id VARCHAR(120) NULL,
    ADD COLUMN IF NOT EXISTS stripe_price_id VARCHAR(120) NULL;

CREATE TABLE IF NOT EXISTS emoon.emoon_domiciliation_subscriptions (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES emoon.emoon_users(id),
    package_id UUID NOT NULL REFERENCES emoon.emoon_packages(id),
    stripe_subscription_id VARCHAR(120) NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'active', -- active | paused | cancelled
    amount NUMERIC(10, 2) NOT NULL,
    next_charge_date DATE NULL,
    last_reminder_sent_at TIMESTAMP NULL,
    last_failed_at TIMESTAMP NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

ALTER TABLE emoon.emoon_settings
    ADD COLUMN IF NOT EXISTS domiciliation_rules JSONB NULL; -- { enabled, retryDays, reminderDaysBefore }
