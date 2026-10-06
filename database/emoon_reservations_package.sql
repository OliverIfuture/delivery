-- Emoon: cada reserva recuerda qué paquete pagó (y si realmente descontó
-- crédito) para devolverlo al paquete correcto al cancelar.
-- NULL en charged_credit = reserva anterior a este cambio.
ALTER TABLE emoon.emoon_reservations ADD COLUMN IF NOT EXISTS user_package_id uuid NULL;
ALTER TABLE emoon.emoon_reservations ADD COLUMN IF NOT EXISTS charged_credit boolean NULL;
