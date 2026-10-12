-- scripts/delete_overdue_clients_company1.sql
--
-- Borra los 38 clientes de trainer+@gmail.com (company id 1) cuya última
-- membresía venció hace más de 2 meses (status past_due/canceled),
-- replicando EXACTAMENTE lo que hace el botón "Eliminar cliente" del
-- panel (ver models/clientDeletion.js):
--   1) Borra todo su historial de entrenador (rutinas, dietas, fotos de
--      progreso, métricas, pagos, notas privadas, etc.)
--   2) Si NO tiene actividad real en otro producto de esta misma base de
--      datos compartida (tienda, gimnasio, wallet, afiliados, POS),
--      borra también su cuenta (users) por completo. Si SÍ la tiene,
--      solo se desvincula de este entrenador (id_entrenador/mi_store a
--      NULL) — esa otra actividad nunca se toca.
--
-- Ya se excluyó manualmente 1 cuenta de prueba de Apple (appletest@gmail.com,
-- status quedó como 'active' pese a tener fecha vencida) y se revisó que
-- ninguna de estas 38 tenga "apple"/"android" en nombre o correo.
--
-- Revalida cada id contra la base justo antes de borrar (por si algo
-- cambió desde que se armó esta lista) y nunca toca la fila "Tú" del
-- propio entrenador (is_self_client).

DO $$
DECLARE
    client_ids INT[] := ARRAY[
        21703, 21769, 22331, 22330, 21902, 21934, 22132, 22297, 22429, 22561,
        22562, 22627, 23124, 23089, 23126, 22759, 22727, 22792, 22925, 22990,
        23023, 21637, 22462, 22528, 23254, 23321, 23323, 23691, 23690, 22892,
        23784, 24211, 22165, 23256, 21802, 23386, 23591, 24610
    ];
    cid INT;
    v_email TEXT;
    v_is_self BOOLEAN;
    v_cross_product TEXT;
    n_deleted INT := 0;
    n_detached INT := 0;
    n_skipped INT := 0;
    n_errors INT := 0;
BEGIN
    FOREACH cid IN ARRAY client_ids LOOP
        BEGIN
            -- Revalida que de verdad siga siendo cliente real de company 1
            SELECT email, is_self_client INTO v_email, v_is_self
            FROM users WHERE id = cid AND id_entrenador = 1;

            IF v_email IS NULL THEN
                RAISE NOTICE 'id=% -> SKIPPED (ya no pertenece a este entrenador o no existe)', cid;
                n_skipped := n_skipped + 1;
                CONTINUE;
            END IF;

            IF v_is_self THEN
                RAISE NOTICE 'id=% -> SKIPPED (is_self_client)', cid;
                n_skipped := n_skipped + 1;
                CONTINUE;
            END IF;

            -- 1) Borra todo lo del panel de entrenador
            DELETE FROM client_subscriptions WHERE id_client = cid;
            DELETE FROM payment_history WHERE id_client = cid;
            DELETE FROM workout_logs WHERE id_client = cid;
            DELETE FROM client_metrics_log WHERE id_client = cid;
            DELETE FROM client_progress_photos WHERE id_client = cid;
            DELETE FROM routines WHERE id_client = cid;
            DELETE FROM diets WHERE id_client = cid;
            DELETE FROM ai_generated_diets WHERE id_client = cid;
            DELETE FROM client_nutrition_goals WHERE id_client = cid;
            DELETE FROM client_nutrition_log WHERE id_client = cid;
            DELETE FROM client_diets_v2 WHERE id_client = cid;
            DELETE FROM client_diet_assignments WHERE id_client = cid;
            DELETE FROM client_private_notes WHERE id_client = cid;
            DELETE FROM user_questionnaires WHERE user_email = v_email;

            -- 2) Revisa actividad real en otro producto de la plataforma
            v_cross_product := NULL;
            IF EXISTS (SELECT 1 FROM orders WHERE id_client = cid) THEN
                v_cross_product := 'pedidos de tienda';
            ELSIF EXISTS (SELECT 1 FROM gym_memberships WHERE id_client = cid) THEN
                v_cross_product := 'membresías de gimnasio';
            ELSIF EXISTS (SELECT 1 FROM wallet_transactions WHERE id_user = cid) THEN
                v_cross_product := 'movimientos de wallet';
            ELSIF EXISTS (SELECT 1 FROM affiliate_commissions WHERE id_client_buyer = cid) THEN
                v_cross_product := 'comisiones de afiliado';
            ELSIF EXISTS (SELECT 1 FROM pos_sales WHERE id_user_staff = cid) THEN
                v_cross_product := 'ventas de POS';
            ELSIF EXISTS (SELECT 1 FROM pos_shifts WHERE id_user_staff = cid) THEN
                v_cross_product := 'turnos de POS';
            ELSIF EXISTS (SELECT 1 FROM points_log WHERE id_user = cid) THEN
                v_cross_product := 'historial de puntos';
            END IF;

            IF v_cross_product IS NOT NULL THEN
                UPDATE users SET id_entrenador = NULL, mi_store = NULL WHERE id = cid;
                RAISE NOTICE 'id=% <%> -> DETACHED (actividad en otro producto: %)', cid, v_email, v_cross_product;
                n_detached := n_detached + 1;
            ELSE
                DELETE FROM users WHERE id = cid;
                RAISE NOTICE 'id=% <%> -> DELETED (cuenta completa borrada)', cid, v_email;
                n_deleted := n_deleted + 1;
            END IF;

        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'id=% -> ERROR: %', cid, SQLERRM;
            n_errors := n_errors + 1;
        END;
    END LOOP;

    RAISE NOTICE '--- RESUMEN: % borrados completos, % desvinculados, % omitidos, % errores ---', n_deleted, n_detached, n_skipped, n_errors;
END $$;
