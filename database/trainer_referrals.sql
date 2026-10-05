-- Referidos entre entrenadores. Ejecutar UNA vez en la base de producción.
CREATE TABLE IF NOT EXISTS trainer_referrals (
    id SERIAL PRIMARY KEY,
    referrer_company_id BIGINT NOT NULL,
    referred_company_id BIGINT NOT NULL UNIQUE,
    referred_user_id BIGINT,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    reward_amount NUMERIC(10,2) NOT NULL DEFAULT 250,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    rewarded_at TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_trainer_referrals_referrer ON trainer_referrals(referrer_company_id);
