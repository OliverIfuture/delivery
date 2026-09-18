-- Estado del cobro administrativo mensual (Hosting profesional + Server controller emoon-studio)
-- admin_billing_period identifica el ciclo ('YYYY-MM') al que pertenece admin_billing_status,
-- para que el recordatorio se reinicie automáticamente cada mes en vez de quedar 'paid' para siempre.

ALTER TABLE IF EXISTS emoon.emoon_settings
    ADD COLUMN IF NOT EXISTS admin_billing_status character varying(30) NOT NULL DEFAULT 'pending',
    ADD COLUMN IF NOT EXISTS admin_billing_period character varying(7),
    ADD COLUMN IF NOT EXISTS admin_billing_last_updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    ADD COLUMN IF NOT EXISTS admin_billing_paid_at timestamp with time zone,
    ADD COLUMN IF NOT EXISTS admin_billing_dismissed_at timestamp with time zone;

UPDATE emoon.emoon_settings
SET admin_billing_status = COALESCE(admin_billing_status, 'pending'),
    admin_billing_period = COALESCE(admin_billing_period, to_char(CURRENT_DATE, 'YYYY-MM')),
    admin_billing_last_updated_at = COALESCE(admin_billing_last_updated_at, CURRENT_TIMESTAMP)
WHERE id = 1;
