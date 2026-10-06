-- Emoon: una reserva cancelada no debe impedir volver a reservar la misma clase.
-- La restricción única antigua ignoraba el estado; se sustituye por un índice
-- único parcial solo sobre reservas no canceladas.
ALTER TABLE emoon.emoon_reservations DROP CONSTRAINT IF EXISTS emoon_reservations_user_id_scheduled_class_id_key;
CREATE UNIQUE INDEX IF NOT EXISTS emoon_reservations_user_class_active_key
  ON emoon.emoon_reservations (user_id, scheduled_class_id)
  WHERE status IS DISTINCT FROM 'cancelled';
