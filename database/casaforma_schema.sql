-- database/casaforma_schema.sql
--
-- Base de datos real de Casa Forma — mismo servidor y mismo Postgres que
-- ya usan Trainer Partners (schema "public") y Emoon (schema "emoon"),
-- pero en SU PROPIO schema ("casaforma") para que los datos de un club
-- nunca se mezclen con los del otro. Mismo patrón de nombres que Emoon
-- (tabla.schema = "casaforma.casaforma_<entidad>"), reconstruido 1:1 a
-- partir de los campos que ya usa src/data/mockDb.js en el frontend
-- (casa-forma fue construido heredando la forma de los datos de Emoon,
-- así que el mapeo es casi directo).
--
-- Seguro de correr más de una vez (IF NOT EXISTS en todo) porque esto se
-- ejecuta a mano contra producción, no por una herramienta de migración.

CREATE SCHEMA IF NOT EXISTS casaforma;

-- ============================================================
-- USUARIOS (admin / instructor / client, misma tabla para los 3 roles
-- igual que emoon.emoon_users)
-- ============================================================
CREATE TABLE IF NOT EXISTS casaforma.casaforma_users (
    id BIGSERIAL PRIMARY KEY,
    first_name VARCHAR(120) NOT NULL,
    last_name VARCHAR(120) NOT NULL DEFAULT '',
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    phone VARCHAR(40) NOT NULL DEFAULT '',
    role VARCHAR(20) NOT NULL DEFAULT 'client', -- admin | instructor | client
    is_active BOOLEAN NOT NULL DEFAULT true,
    avatar_url VARCHAR(500) NULL,
    birth_date DATE NULL,
    stats_classes_attended INT NOT NULL DEFAULT 0,
    stats_total_spent NUMERIC(10, 2) NOT NULL DEFAULT 0,
    -- Recuperación de contraseña: mismo patrón que
    -- database/users_password_reset.sql (trainer-partners) — código +
    -- vencimiento directo en la fila del usuario, sin tabla aparte.
    password_reset_code VARCHAR(6) NULL,
    password_reset_expires_at TIMESTAMP NULL,
    is_deleted BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ============================================================
-- CATEGORÍAS DE CLASE — id de texto (slug) a propósito, igual que
-- emoon.emoon_class_categories: lo asigna quien la crea, no autonumérico.
-- ============================================================
CREATE TABLE IF NOT EXISTS casaforma.casaforma_class_categories (
    id VARCHAR(60) PRIMARY KEY,
    name VARCHAR(120) NOT NULL,
    color_hex VARCHAR(20) NOT NULL DEFAULT '#c7a567',
    description TEXT NULL
);

-- ============================================================
-- TIPOS DE CLASE (plantilla) — las instancias con fecha van en
-- casaforma_scheduled_classes.
-- ============================================================
CREATE TABLE IF NOT EXISTS casaforma.casaforma_class_types (
    id BIGSERIAL PRIMARY KEY,
    category_id VARCHAR(60) NULL REFERENCES casaforma.casaforma_class_categories(id),
    name VARCHAR(160) NOT NULL,
    description TEXT NULL,
    duration_minutes INT NOT NULL DEFAULT 45,
    max_capacity INT NOT NULL DEFAULT 10,
    intensity VARCHAR(40) NOT NULL DEFAULT 'Todos los niveles',
    is_active BOOLEAN NOT NULL DEFAULT true,
    is_deleted BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ============================================================
-- CLASES AGENDADAS (calendario / check-in / reservaciones)
-- ============================================================
CREATE TABLE IF NOT EXISTS casaforma.casaforma_scheduled_classes (
    id BIGSERIAL PRIMARY KEY,
    class_type_id BIGINT NOT NULL REFERENCES casaforma.casaforma_class_types(id),
    instructor_id BIGINT NOT NULL REFERENCES casaforma.casaforma_users(id),
    scheduled_datetime TIMESTAMP NOT NULL,
    override_capacity INT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'scheduled' -- scheduled | cancelled
);

-- ============================================================
-- PAQUETES / MEMBRESÍAS — is_domiciliado + billing_cycle_days son lo que
-- Casa Forma tiene DE MÁS respecto a Emoon (ver domiciliationProvider.js
-- del frontend): cada paquete decide si cobra una sola vez o se recarga
-- solo, y cada cuántos días.
-- ============================================================
CREATE TABLE IF NOT EXISTS casaforma.casaforma_packages (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(160) NOT NULL,
    category_id VARCHAR(60) NULL REFERENCES casaforma.casaforma_class_categories(id),
    description TEXT NULL,
    price NUMERIC(10, 2) NOT NULL,
    credits INT NULL, -- NULL = ilimitado (membresía)
    type_id VARCHAR(30) NOT NULL DEFAULT 'class_pack', -- class_pack | membership
    validity_days INT NOT NULL DEFAULT 30,
    min_age INT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    is_featured BOOLEAN NOT NULL DEFAULT false,
    is_domiciliado BOOLEAN NOT NULL DEFAULT false,
    billing_cycle_days INT NULL,
    is_deleted BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ============================================================
-- PAGOS (lo que el frontend llama "purchases")
-- ============================================================
CREATE TABLE IF NOT EXISTS casaforma.casaforma_payments (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES casaforma.casaforma_users(id),
    package_id BIGINT NULL REFERENCES casaforma.casaforma_packages(id),
    amount NUMERIC(10, 2) NOT NULL,
    payment_method VARCHAR(60) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'completado',
    stripe_payment_intent_id VARCHAR(120) NULL,
    stripe_receipt_url VARCHAR(500) NULL,
    paid_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ============================================================
-- CRÉDITOS/MEMBRESÍAS VIGENTES POR CLIENTE
-- ============================================================
CREATE TABLE IF NOT EXISTS casaforma.casaforma_user_packages (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES casaforma.casaforma_users(id),
    package_id BIGINT NOT NULL REFERENCES casaforma.casaforma_packages(id),
    payment_id BIGINT NULL REFERENCES casaforma.casaforma_payments(id),
    activation_date DATE NOT NULL DEFAULT CURRENT_DATE,
    expiration_date DATE NULL,
    remaining_classes INT NULL, -- NULL = membresía ilimitada
    status VARCHAR(20) NOT NULL DEFAULT 'active', -- active | depleted | expired
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ============================================================
-- RESERVACIONES
-- ============================================================
CREATE TABLE IF NOT EXISTS casaforma.casaforma_reservations (
    id BIGSERIAL PRIMARY KEY,
    scheduled_class_id BIGINT NOT NULL REFERENCES casaforma.casaforma_scheduled_classes(id),
    user_id BIGINT NOT NULL REFERENCES casaforma.casaforma_users(id),
    user_package_id BIGINT NULL REFERENCES casaforma.casaforma_user_packages(id),
    charged_credit BOOLEAN NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'confirmed', -- confirmed | cancelled
    attended BOOLEAN NOT NULL DEFAULT false,
    reserved_at TIMESTAMP NOT NULL DEFAULT NOW(),
    cancelled_at TIMESTAMP NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ============================================================
-- CONFIGURACIÓN DEL CLUB — fila única (id = 1), igual que
-- emoon.emoon_settings: cada bloque vive en su propia columna JSONB.
-- ============================================================
CREATE TABLE IF NOT EXISTS casaforma.casaforma_settings (
    id INT PRIMARY KEY DEFAULT 1,
    general_info JSONB NULL,
    booking_rules JSONB NULL,
    business_hours JSONB NULL,
    domiciliation_rules JSONB NULL, -- { enabled, retryDays, reminderDaysBefore }
    admin_billing_status VARCHAR(20) NULL,
    admin_billing_period VARCHAR(10) NULL,
    admin_billing_last_updated_at TIMESTAMP NULL,
    admin_billing_paid_at TIMESTAMP NULL,
    admin_billing_dismissed_at TIMESTAMP NULL,
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT casaforma_settings_single_row CHECK (id = 1)
);

-- ============================================================
-- STRIPE CONNECT — una sola cuenta Express para todo el club (a
-- diferencia de Trainer Partners, Casa Forma no es multi-tenant), por
-- eso también es fila única. Reemplaza la simulación de
-- stripeConnectProvider.js una vez que esto quede conectado de verdad.
-- ============================================================
CREATE TABLE IF NOT EXISTS casaforma.casaforma_stripe_connect (
    id INT PRIMARY KEY DEFAULT 1,
    status VARCHAR(20) NOT NULL DEFAULT 'not_connected', -- not_connected | pending | active
    stripe_account_id VARCHAR(120) NULL,
    charges_enabled BOOLEAN NOT NULL DEFAULT false,
    details_submitted BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT casaforma_stripe_connect_single_row CHECK (id = 1)
);

-- ============================================================
-- DOMICILIACIÓN (cargo recurrente automático) — feature que Casa Forma
-- tiene DE MÁS respecto a Emoon. stripe_subscription_id queda NULL hasta
-- que Stripe Connect sea real.
-- ============================================================
CREATE TABLE IF NOT EXISTS casaforma.casaforma_domiciliation_subscriptions (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES casaforma.casaforma_users(id),
    package_id BIGINT NOT NULL REFERENCES casaforma.casaforma_packages(id),
    stripe_subscription_id VARCHAR(120) NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'active', -- active | paused | cancelled
    amount NUMERIC(10, 2) NOT NULL,
    next_charge_date DATE NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Fila inicial de configuración (igual que Emoon la crea con ON CONFLICT
-- DO UPDATE desde el controller) — la sembramos aquí para que exista
-- desde el día uno.
INSERT INTO casaforma.casaforma_settings (id, general_info, booking_rules, business_hours, domiciliation_rules, admin_billing_status)
VALUES (
    1,
    '{"studioName":"Casa Forma","email":"contacto@casaforma.mx","phone":"664 112 3344","address":"Blvd. Universidad 291, Tecate, B.C.","instagram":"@casaforma.club","whatsapp":"6641123344"}',
    '{"cancellationWindowHours":6,"bookingAdvanceDays":7,"waitlistLimit":5}',
    '[]',
    '{"enabled":true,"retryDays":3,"reminderDaysBefore":2}',
    'paid'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO casaforma.casaforma_stripe_connect (id, status)
VALUES (1, 'not_connected')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- AJUSTES POSTERIORES (el schema de arriba ya corrió en producción, así
-- que las correcciones van en ALTER TABLE ... IF NOT EXISTS, no editando
-- el CREATE TABLE original).
-- ============================================================

-- "intensity" — el formulario de ClassesWidget.vue (admin) ya manda este
-- campo (igual que emoon_class_types.intensity), faltaba en la tabla.
ALTER TABLE casaforma.casaforma_class_types
    ADD COLUMN IF NOT EXISTS intensity VARCHAR(40) NOT NULL DEFAULT 'Todos los niveles';
