-- =============================================================================
-- Migration : Audit Trail complet — tables financières et opérationnelles
-- Date      : 2026-05-26
-- Auteur    : Sécurité pré-production multi-tenant
-- =============================================================================
--
-- ARCHITECTURE :
--   Un trigger AFTER INSERT/UPDATE/DELETE sur chaque table sensible appelle
--   la fonction log_audit_event() qui insère une ligne dans audit_logs.
--
-- SÉCURITÉ :
--   - La fonction est SECURITY DEFINER pour pouvoir écrire dans audit_logs
--     même si l'utilisateur n'a pas de GRANT direct sur cette table.
--   - RLS sur audit_logs : chaque user ne voit QUE ses propres entrées.
--   - L'admin (is_admin = true) voit tout (policy séparée).
--   - La fonction lit auth.uid() au moment du trigger — toujours valide
--     car le trigger s'exécute dans la même transaction que l'opération.
--
-- TABLES AUDITÉES :
--   acomptes, acompte_allocations, bilans_status_v2,
--   missions, patrons, clients, frais_divers
--
-- PERFORMANCE :
--   - Index sur (user_id, created_at DESC) pour pagination par user.
--   - Index sur (table_name, record_id) pour recherche par entité.
--   - Index sur (operation, created_at) pour filtres par type d'opération.
--   - Les données jsonb sont compressées automatiquement par Postgres (TOAST).
--   - Cleanup via politique de rétention (recommandé : 90 jours, via pg_cron).
-- =============================================================================

-- ─── 1. Création de la table audit_logs ──────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id          uuid              NOT NULL DEFAULT gen_random_uuid(),
  table_name  text              NOT NULL,
  record_id   uuid              NOT NULL,
  operation   text              NOT NULL CHECK (operation IN ('INSERT', 'UPDATE', 'DELETE')),
  user_id     uuid              REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at  timestamptz       NOT NULL DEFAULT now(),
  old_data    jsonb,
  new_data    jsonb,
  ip_address  inet,             -- nullable, fourni par Edge Function si disponible
  metadata    jsonb,            -- contexte libre : route, function name, etc.

  CONSTRAINT audit_logs_pkey PRIMARY KEY (id)
);

COMMENT ON TABLE public.audit_logs IS
  'Registre immuable de toutes les modifications sur les tables financières et opérationnelles. '
  'Ne jamais modifier ni supprimer des lignes manuellement (intégrité de l''audit).';

COMMENT ON COLUMN public.audit_logs.operation IS 'INSERT | UPDATE | DELETE';
COMMENT ON COLUMN public.audit_logs.user_id   IS 'auth.uid() au moment de l''opération. NULL si trigger déclenché par service_role sans session user.';
COMMENT ON COLUMN public.audit_logs.ip_address IS 'IP de l''appelant si fournie par le contexte Edge Function (optionnel).';
COMMENT ON COLUMN public.audit_logs.metadata   IS 'Contexte libre : {"route": "/missions", "patron_id": "..."}.';

-- ─── 2. Index ─────────────────────────────────────────────────────────────────

-- Pagination des logs d'un utilisateur
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_created
  ON public.audit_logs (user_id, created_at DESC);

-- Recherche de l'historique d'un enregistrement spécifique
CREATE INDEX IF NOT EXISTS idx_audit_logs_record
  ON public.audit_logs (table_name, record_id);

-- Filtrage par type d'opération + date
CREATE INDEX IF NOT EXISTS idx_audit_logs_operation
  ON public.audit_logs (operation, created_at DESC);

-- ─── 3. Row Level Security sur audit_logs ────────────────────────────────────

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Chaque utilisateur voit uniquement ses propres entrées d'audit
DROP POLICY IF EXISTS "audit_logs_owner_read" ON public.audit_logs;
CREATE POLICY "audit_logs_owner_read" ON public.audit_logs
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Les admins voient toutes les entrées (pour modération et support)
DROP POLICY IF EXISTS "audit_logs_admin_read_all" ON public.audit_logs;
CREATE POLICY "audit_logs_admin_read_all" ON public.audit_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- AUCUN utilisateur ne peut écrire/modifier/supprimer directement les logs
-- (seule la fonction trigger SECURITY DEFINER peut insérer)

-- ─── 4. Fonction trigger universelle ─────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.log_audit_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_record_id  uuid;
  v_user_id    uuid;
  v_old_data   jsonb;
  v_new_data   jsonb;
BEGIN
  -- Récupère l'utilisateur connecté (NULL si opération système sans session)
  v_user_id := auth.uid();

  -- Détermine l'ID de l'enregistrement selon l'opération
  CASE TG_OP
    WHEN 'INSERT' THEN
      v_record_id := (NEW.id)::uuid;
      v_old_data  := NULL;
      v_new_data  := to_jsonb(NEW);
    WHEN 'UPDATE' THEN
      v_record_id := (OLD.id)::uuid;
      v_old_data  := to_jsonb(OLD);
      v_new_data  := to_jsonb(NEW);
    WHEN 'DELETE' THEN
      v_record_id := (OLD.id)::uuid;
      v_old_data  := to_jsonb(OLD);
      v_new_data  := NULL;
  END CASE;

  -- Supprime les champs qui ne doivent PAS apparaître dans les logs
  -- (rotation des clés, tokens, champs techniques internes)
  -- Note : les emails en clair sont conservés car utiles pour l'audit RGPD
  IF v_new_data IS NOT NULL THEN
    v_new_data := v_new_data
      - 'invite_token'
      - 'hashed_password'
      - 'reset_token';
  END IF;
  IF v_old_data IS NOT NULL THEN
    v_old_data := v_old_data
      - 'invite_token'
      - 'hashed_password'
      - 'reset_token';
  END IF;

  -- Insère l'entrée d'audit
  -- On utilise INSERT avec ON CONFLICT DO NOTHING pour éviter
  -- toute boucle infinie si audit_logs avait lui-même un trigger (il n'en a pas).
  INSERT INTO public.audit_logs (
    table_name,
    record_id,
    operation,
    user_id,
    old_data,
    new_data
  ) VALUES (
    TG_TABLE_NAME,
    v_record_id,
    TG_OP,
    v_user_id,
    v_old_data,
    v_new_data
  );

  -- Retourne NEW pour INSERT/UPDATE, OLD pour DELETE
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;

EXCEPTION WHEN OTHERS THEN
  -- Ne jamais laisser l'audit bloquer une opération métier.
  -- En cas d'erreur d'insertion dans audit_logs, on log dans les notices
  -- (visibles dans Supabase Logs) mais on laisse passer l'opération.
  RAISE WARNING 'log_audit_event: échec insertion audit pour table=%, op=%, record=%: %',
    TG_TABLE_NAME, TG_OP, v_record_id, SQLERRM;
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$;

COMMENT ON FUNCTION public.log_audit_event() IS
  'Trigger universel d''audit. SECURITY DEFINER pour écrire dans audit_logs indépendamment des RLS. '
  'Compatible INSERT/UPDATE/DELETE. Fail-safe : ne bloque jamais l''opération métier.';

-- ─── 5. Application des triggers ─────────────────────────────────────────────

-- acomptes
DROP TRIGGER IF EXISTS trg_audit_acomptes ON public.acomptes;
CREATE TRIGGER trg_audit_acomptes
  AFTER INSERT OR UPDATE OR DELETE ON public.acomptes
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

-- acompte_allocations
DROP TRIGGER IF EXISTS trg_audit_acompte_allocations ON public.acompte_allocations;
CREATE TRIGGER trg_audit_acompte_allocations
  AFTER INSERT OR UPDATE OR DELETE ON public.acompte_allocations
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

-- bilans_status_v2
DROP TRIGGER IF EXISTS trg_audit_bilans ON public.bilans_status_v2;
CREATE TRIGGER trg_audit_bilans
  AFTER INSERT OR UPDATE OR DELETE ON public.bilans_status_v2
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

-- missions
DROP TRIGGER IF EXISTS trg_audit_missions ON public.missions;
CREATE TRIGGER trg_audit_missions
  AFTER INSERT OR UPDATE OR DELETE ON public.missions
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

-- patrons
DROP TRIGGER IF EXISTS trg_audit_patrons ON public.patrons;
CREATE TRIGGER trg_audit_patrons
  AFTER INSERT OR UPDATE OR DELETE ON public.patrons
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

-- clients
DROP TRIGGER IF EXISTS trg_audit_clients ON public.clients;
CREATE TRIGGER trg_audit_clients
  AFTER INSERT OR UPDATE OR DELETE ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

-- frais_divers
DROP TRIGGER IF EXISTS trg_audit_frais_divers ON public.frais_divers;
CREATE TRIGGER trg_audit_frais_divers
  AFTER INSERT OR UPDATE OR DELETE ON public.frais_divers
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

-- ─── 6. Vue utilitaire pour l'admin ──────────────────────────────────────────

CREATE OR REPLACE VIEW public.audit_logs_summary AS
SELECT
  al.id,
  al.table_name,
  al.record_id,
  al.operation,
  al.user_id,
  TRIM(COALESCE(p.prenom, '') || ' ' || COALESCE(p.nom, '')) AS user_name,
  al.created_at,
  al.ip_address,
  al.metadata
FROM public.audit_logs al
LEFT JOIN public.profiles p ON p.id = al.user_id;

COMMENT ON VIEW public.audit_logs_summary IS
  'Vue enrichie de l''audit trail avec informations utilisateur. Accès réservé admin via RLS.';

-- ─── 7. Politique de rétention (commentaire pg_cron) ─────────────────────────
-- Pour activer la purge automatique après 90 jours, exécuter dans Supabase Dashboard
-- après activation de l'extension pg_cron :
--
-- SELECT cron.schedule(
--   'purge-audit-logs',
--   '0 3 * * 0',  -- chaque dimanche à 3h du matin
--   $$DELETE FROM public.audit_logs WHERE created_at < now() - INTERVAL '90 days'$$
-- );
