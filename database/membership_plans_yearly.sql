-- Precio anual por plan (aditiva). price_yearly es el monto a cobrar una vez al año;
-- stripe_price_id_yearly es el Price de Stripe (interval=year) para ese cobro.
ALTER TABLE membership_plans ADD COLUMN IF NOT EXISTS price_yearly NUMERIC;
ALTER TABLE membership_plans ADD COLUMN IF NOT EXISTS stripe_price_id_yearly VARCHAR(255);
