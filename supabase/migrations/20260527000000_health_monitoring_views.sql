-- supabase/migrations/20260527000000_health_monitoring_views.sql
-- ─────────────────────────────────────────────────────────────────────────────
-- Santé système — Sécurité backend pour la page admin "Cockpit système"
--
-- SÉCURITÉ :
--   - La RPC get_health_stats() vérifie is_admin côté Postgres (SECURITY DEFINER)
--   - Le rate_limit_log est protégé par RLS admin-only
--   - Aucune donnée brute n'est exposée — uniquement des agrégats
--   - Un utilisateur normal ne peut PAS contourner ces protections
--     en modifiant le frontend ou les requêtes réseau.
-- ─────────────────────────────────────────────────────────────────────────────

-- ─── 1. RLS sur rate_limit_log ────────────────────────────────────────────────

ALTER TABLE public.rate_limit_log ENABLE ROW LEVEL SECURITY;

-- Seuls les admins peuvent lire les logs de rate limiting
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'rate_limit_log'
      AND policyname = 'admin_read_rate_limit_log'
  ) THEN
    CREATE POLICY "admin_read_rate_limit_log"
    ON public.rate_limit_log
    FOR SELECT
    USING (
      EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid()
          AND is_admin = true
      )
    );
  END IF;
END
$$;

-- ─── 2. Fonction RPC sécurisée : statistiques de santé globales ───────────────
-- SECURITY DEFINER : la fonction s'exécute avec les droits du propriétaire,
-- pas de l'appelant — mais elle vérifie ELLE-MÊME que l'appelant est admin.
-- Ainsi, même un utilisateur qui trouverait le nom de la fonction ne peut
-- pas l'appeler pour obtenir des données s'il n'est pas admin.

CREATE OR REPLACE FUNCTION public.get_health_stats()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_admin boolean := false;
  v_result   jsonb;
BEGIN
  -- ── Vérification admin (obligatoire) ──────────────────────────────────────
  SELECT is_admin INTO v_is_admin
  FROM public.profiles
  WHERE id = auth.uid();

  IF v_is_admin IS NOT TRUE THEN
    RAISE EXCEPTION 'Accès refusé' USING ERRCODE = '42501';
  END IF;

  -- ── Agrégats de santé (aucune donnée brute exposée) ───────────────────────
  SELECT jsonb_build_object(

    -- Activité audit_logs
    'audit_events_24h',
    (SELECT COUNT(*) FROM public.audit_logs
     WHERE created_at > NOW() - INTERVAL '24 hours'),

    'audit_events_1h',
    (SELECT COUNT(*) FROM public.audit_logs
     WHERE created_at > NOW() - INTERVAL '1 hour'),

    -- Rate limiting
    'rate_limit_hits_1h',
    (SELECT COUNT(*) FROM public.rate_limit_log
     WHERE created_at > NOW() - INTERVAL '1 hour'),

    'rate_limit_hits_24h',
    (SELECT COUNT(*) FROM public.rate_limit_log
     WHERE created_at > NOW() - INTERVAL '24 hours'),

    -- Action la plus fréquente (nom technique uniquement — pas de données user)
    'top_rate_limit_action',
    (
      SELECT action
      FROM public.rate_limit_log
      WHERE created_at > NOW() - INTERVAL '24 hours'
      GROUP BY action
      ORDER BY COUNT(*) DESC
      LIMIT 1
    ),

    -- Appels Edge Functions (déduits du rate_limit_log par action)
    'send_email_calls_24h',
    (SELECT COUNT(*) FROM public.rate_limit_log
     WHERE action = 'SEND_PLANNING_EMAIL'
       AND created_at > NOW() - INTERVAL '24 hours'),

    'send_invite_calls_24h',
    (SELECT COUNT(*) FROM public.rate_limit_log
     WHERE action = 'SEND_PATRON_INVITE'
       AND created_at > NOW() - INTERVAL '24 hours'),

    -- Dernier événement enregistré (date uniquement, pas de contenu)
    'last_audit_event',
    (SELECT created_at FROM public.audit_logs
     ORDER BY created_at DESC
     LIMIT 1)

  ) INTO v_result;

  RETURN v_result;
END;
$$;

-- Sécuriser l'accès à la fonction :
-- - Retirer l'accès PUBLIC (défaut Postgres)
-- - N'autoriser que les utilisateurs authentifiés (la fonction vérifie is_admin elle-même)
REVOKE ALL ON FUNCTION public.get_health_stats() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_health_stats() TO authenticated;

-- ─── 3. Commentaires de documentation ────────────────────────────────────────

COMMENT ON FUNCTION public.get_health_stats() IS
  'Retourne des agrégats de santé système. Accès strictement limité aux administrateurs (is_admin = true). Ne retourne aucune donnée brute.';
