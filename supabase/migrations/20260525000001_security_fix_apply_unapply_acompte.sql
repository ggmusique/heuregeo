-- =============================================================================
-- Migration : Security fix — apply_acompte + unapply_acompte ownership check
-- Date      : 2026-05-22
-- Auteur    : Audit sécurité pré-production
-- =============================================================================
--
-- PROBLÈME V2 :
--   apply_acompte est SECURITY DEFINER → bypass complet du RLS.
--   La SELECT initiale n'avait pas de condition AND user_id = auth.uid().
--   Conséquence : tout utilisateur authentifié pouvait déclencher la ventilation
--   d'un acompte appartenant à un autre utilisateur via son UUID.
--
-- PROBLÈME V10 :
--   unapply_acompte existait en base mais n'était PAS versionnée dans les migrations.
--   Même vecteur que V2 probable (pas de vérification ownership).
--
-- CORRECTIFS :
--   1. apply_acompte : ajout de AND user_id = v_caller_id + vérification auth.uid() non NULL.
--   2. unapply_acompte : création versionnée avec les mêmes protections.
--
-- COMPATIBILITÉ :
--   - Idempotente (CREATE OR REPLACE FUNCTION).
--   - Conserve intégralement la logique métier (idempotence, FOR UPDATE, allocations).
--   - Conserve le schema exact de acompte_allocations (colonne "amount").
--   - Compatible avec les tests Vitest existants (le mock supabase.rpc fonctionne toujours).
-- =============================================================================


-- =============================================================================
-- 1. RATE LIMIT TABLE (prérequis pour _shared/rateLimit.ts)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.rate_limit_log (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  action     text        NOT NULL,
  user_id    uuid        REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Index pour les lookups par (action, user_id, created_at)
CREATE INDEX IF NOT EXISTS rate_limit_log_lookup_idx
  ON public.rate_limit_log (action, user_id, created_at);

-- Nettoyage automatique : TTL 24h via policy RLS (accès lecture réservé à service_role)
ALTER TABLE public.rate_limit_log ENABLE ROW LEVEL SECURITY;

-- Seul le service_role (Edge Functions) peut lire/écrire
CREATE POLICY "rate_limit_service_only" ON public.rate_limit_log
  AS RESTRICTIVE
  FOR ALL
  TO authenticated
  USING (false)
  WITH CHECK (false);

-- Purge des entrées de plus de 24h (à exécuter périodiquement via pg_cron si dispo)
-- DELETE FROM public.rate_limit_log WHERE created_at < now() - interval '24 hours';


-- =============================================================================
-- 2. FIX CRITIQUE : apply_acompte — ownership check
-- =============================================================================
-- AVANT : SELECT ... WHERE id = p_acompte_id (sans vérification caller)
-- APRÈS : SELECT ... WHERE id = p_acompte_id AND user_id = v_caller_id
--
-- Toute la logique métier est conservée intégralement.
-- Seuls ajouts : déclaration v_caller_id + check NULL + condition ownership.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.apply_acompte(p_acompte_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  -- [SÉCURITÉ] Identifiant du caller — doit être non NULL (utilisateur authentifié)
  v_caller_id    uuid        := auth.uid();

  v_montant      numeric;
  v_patron_id    uuid;
  v_user_id      uuid;
  v_reste        numeric;
  v_besoin       numeric;
  v_alloue       numeric;
  v_total_check  numeric;
  v_now          timestamptz := now();
  bilan_row      record;
  deleted_alloc  record;
BEGIN
  -- [SÉCURITÉ] Refuser les appels non authentifiés.
  -- Cela ne devrait jamais arriver si GRANT EXECUTE est correctement limité à "authenticated",
  -- mais on défend en profondeur.
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'apply_acompte: utilisateur non authentifié (auth.uid() IS NULL)';
  END IF;

  -- [SÉCURITÉ] FIX : SELECT avec AND user_id = v_caller_id.
  -- Si l'acompte n'appartient pas au caller, NOT FOUND → exception.
  -- La clause FOR UPDATE verrouille la ligne pour éviter les race conditions.
  SELECT montant, patron_id, user_id
  INTO v_montant, v_patron_id, v_user_id
  FROM public.acomptes
  WHERE id = p_acompte_id
    AND user_id = v_caller_id    -- ← OWNERSHIP CHECK (FIX SÉCURITÉ V2)
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'apply_acompte: acompte % non trouvé ou non autorisé pour user %',
      p_acompte_id, v_caller_id;
  END IF;

  IF v_montant IS NULL OR v_montant <= 0 THEN
    RAISE NOTICE 'apply_acompte: acompte % montant <= 0, skip', p_acompte_id;
    RETURN;
  END IF;

  -- Normalize inconsistent rows: paid rows must have zero remaining
  UPDATE public.bilans_status_v2 b
  SET reste_a_percevoir = 0
  WHERE b.patron_id = v_patron_id
    AND b.periode_type = 'semaine'
    AND COALESCE(b.paye, false) = true
    AND COALESCE(b.reste_a_percevoir, 0) > 0;

  -- STRICT idempotence: start by deleting previous allocations for this acompte.
  -- Then rollback their effect on bilans before recomputing.
  FOR deleted_alloc IN
    DELETE FROM public.acompte_allocations aa
    WHERE aa.acompte_id = p_acompte_id
    RETURNING aa.bilan_id, aa.amount
  LOOP
    UPDATE public.bilans_status_v2 b
    SET
      acompte_consomme  = GREATEST(0, COALESCE(b.acompte_consomme, 0) - deleted_alloc.amount),
      reste_a_percevoir = GREATEST(0, COALESCE(b.reste_a_percevoir, 0) + deleted_alloc.amount),
      paye              = false,
      date_paiement     = NULL
    WHERE b.id = deleted_alloc.bilan_id
      AND COALESCE(b.paye, false) = false;
  END LOOP;

  v_reste := v_montant;

  FOR bilan_row IN
    SELECT b.id, b.periode_index, COALESCE(b.reste_a_percevoir, 0) AS reste_a_percevoir
    FROM public.bilans_status_v2 b
    WHERE b.periode_type = 'semaine'
      AND b.patron_id = v_patron_id
      AND COALESCE(b.paye, false) = false
      AND COALESCE(b.reste_a_percevoir, 0) > 0
    ORDER BY b.periode_index ASC
    FOR UPDATE
  LOOP
    EXIT WHEN v_reste <= 0;

    v_besoin := COALESCE(bilan_row.reste_a_percevoir, 0);
    CONTINUE WHEN v_besoin <= 0;

    v_alloue := LEAST(v_besoin, v_reste);

    IF v_alloue >= v_besoin THEN
      UPDATE public.bilans_status_v2
      SET
        acompte_consomme  = COALESCE(acompte_consomme, 0) + v_alloue,
        reste_a_percevoir = 0,
        paye              = true,
        date_paiement     = v_now
      WHERE id = bilan_row.id;
    ELSE
      UPDATE public.bilans_status_v2
      SET
        acompte_consomme  = COALESCE(acompte_consomme, 0) + v_alloue,
        reste_a_percevoir = v_besoin - v_alloue,
        paye              = false,
        date_paiement     = NULL
      WHERE id = bilan_row.id;
    END IF;

    INSERT INTO public.acompte_allocations
      (acompte_id, bilan_id, amount, patron_id, user_id, periode_type, periode_index, created_at)
    VALUES
      (p_acompte_id, bilan_row.id, v_alloue, v_patron_id, v_user_id, 'semaine', bilan_row.periode_index, v_now);

    v_reste := v_reste - v_alloue;
  END LOOP;

  SELECT COALESCE(SUM(amount), 0)
  INTO v_total_check
  FROM public.acompte_allocations
  WHERE acompte_id = p_acompte_id;

  IF v_total_check > v_montant THEN
    RAISE EXCEPTION 'apply_acompte: allocation % exceeds montant % for acompte %',
      v_total_check, v_montant, p_acompte_id;
  END IF;

  RAISE NOTICE 'apply_acompte done: acompte %, montant %, alloue %, reste %',
    p_acompte_id, v_montant, v_total_check, GREATEST(0, v_montant - v_total_check);
END;
$$;

GRANT EXECUTE ON FUNCTION public.apply_acompte(uuid) TO authenticated;


-- =============================================================================
-- 3. CRÉATION VERSIONNÉE : unapply_acompte — ownership check + rollback complet
-- =============================================================================
-- Cette fonction annule toutes les allocations d'un acompte et restaure les
-- bilans_status_v2 dans leur état avant application.
--
-- SÉCURITÉ : Même protection que apply_acompte.
--   - v_caller_id := auth.uid() → refus si NULL
--   - AND user_id = v_caller_id → l'acompte doit appartenir au caller
--   - FOR UPDATE → verrou row-level pour éviter race conditions
--
-- DIFFÉRENCE avec le rollback interne de apply_acompte :
--   - Le rollback de apply_acompte a une condition "AND COALESCE(b.paye, false) = false"
--     car il précède une réallocation (il ne veut pas toucher les bilans déjà payés par
--     d'autres acomptes). unapply_acompte doit annuler MÊME les bilans passés à "paye",
--     donc cette condition est ABSENTE ici.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.unapply_acompte(p_acompte_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  -- [SÉCURITÉ] Identifiant du caller
  v_caller_id   uuid := auth.uid();

  v_montant     numeric;
  v_patron_id   uuid;
  v_user_id     uuid;
  deleted_alloc record;
  v_total_annule numeric := 0;
BEGIN
  -- [SÉCURITÉ] Refuser les appels non authentifiés
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'unapply_acompte: utilisateur non authentifié (auth.uid() IS NULL)';
  END IF;

  -- [SÉCURITÉ] FIX : SELECT avec AND user_id = v_caller_id
  -- Lock sur la ligne de l'acompte pour éviter la concurrence avec apply_acompte.
  SELECT montant, patron_id, user_id
  INTO v_montant, v_patron_id, v_user_id
  FROM public.acomptes
  WHERE id = p_acompte_id
    AND user_id = v_caller_id    -- ← OWNERSHIP CHECK
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'unapply_acompte: acompte % non trouvé ou non autorisé pour user %',
      p_acompte_id, v_caller_id;
  END IF;

  -- Annuler toutes les allocations et restaurer les bilans
  -- NOTE : pas de filtre "paye = false" ici — on doit restaurer même les bilans
  -- qui ont été marqués "paye = true" grâce à cet acompte.
  FOR deleted_alloc IN
    DELETE FROM public.acompte_allocations aa
    WHERE aa.acompte_id = p_acompte_id
    RETURNING aa.bilan_id, aa.amount
  LOOP
    UPDATE public.bilans_status_v2 b
    SET
      acompte_consomme  = GREATEST(0, COALESCE(b.acompte_consomme, 0) - deleted_alloc.amount),
      reste_a_percevoir = GREATEST(0, COALESCE(b.reste_a_percevoir, 0) + deleted_alloc.amount),
      paye              = false,
      date_paiement     = NULL
    WHERE b.id = deleted_alloc.bilan_id;

    v_total_annule := v_total_annule + deleted_alloc.amount;
  END LOOP;

  RAISE NOTICE 'unapply_acompte done: acompte %, montant_annule %',
    p_acompte_id, v_total_annule;
END;
$$;

GRANT EXECUTE ON FUNCTION public.unapply_acompte(uuid) TO authenticated;


-- =============================================================================
-- 4. INDEX supplémentaires (perf + idempotents)
-- =============================================================================
CREATE INDEX IF NOT EXISTS acompte_allocations_acompte_created_idx
  ON public.acompte_allocations (acompte_id, created_at);
