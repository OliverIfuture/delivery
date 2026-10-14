-- Puntos de interacción de Coach Community (gamificación: niveles tipo
-- "Inspirador"/"Leyenda"). Economía SEPARADA de los puntos de clientes
-- (users.total_points/current_level, ver User.addPoints/getLeaderboard) —
-- mezclar ambas en la misma columna confundiría dos sistemas de
-- gamificación distintos sobre la misma fila de usuario.
--
-- Regla (igual al mockup de referencia): 1 like recibido en un post de
-- Coach Community (id_company=1389) = 1 punto para el autor del post. Los
-- likes a tu propio post no cuentan. Quitar un like resta el punto. Los
-- niveles (Bienvenido/Primer paso/.../Leyenda/Premio Élite) se calculan en
-- código a partir de la suma de esta tabla, no se guardan aquí.
CREATE TABLE IF NOT EXISTS coach_community_points_log (
    id SERIAL PRIMARY KEY,
    id_user INTEGER NOT NULL,
    delta INTEGER NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_coach_community_points_log_user ON coach_community_points_log (id_user);
CREATE INDEX IF NOT EXISTS idx_coach_community_points_log_created_at ON coach_community_points_log (created_at);
