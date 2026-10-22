-- =============================================================================
-- Migration : Repair existing weeks paid by acomptes but not marked as paye
-- Date      : 2026-06-15
-- Auteur    : Réparation données existantes
-- =============================================================================
-- PROBLÈME :
--   Des semaines ont reste_a_percevoir = 0 et acompte_consomme >= ca_brut_periode
--   mais paye = false (données créées avant les fixs apply/unapply_acompte).
--
-- CORRECTIF :
--   Met paye = true et date_paiement = now() pour ces semaines.
--   Idempotent : ne touche qu'aux semaines où paye IS DISTINCT FROM true.
-- =============================================================================

-- 1. Diagnostic : combien de semaines concernées
DO $$
DECLARE
  v_count integer;
BEGIN
  SELECT count(*) INTO v_count
  FROM public.bilans_status_v2
  WHERE periode_type = 'semaine'
    AND COALESCE(paye, false) = false
    AND COALESCE(reste_a_percevoir, 0) = 0
    AND COALESCE(ca_brut_periode, 0) > 0
    AND COALESCE(acompte_consomme, 0) >= COALESCE(ca_brut_periode, 0);
  
  RAISE NOTICE 'Semaines à réparer (paye=false mais reste=0 et acompte>=CA): %', v_count;
END $$;

-- 2. Réparation : marquer comme payées
UPDATE public.bilans_status_v2
SET
  paye = true,
  date_paiement = COALESCE(date_paiement, now())
WHERE periode_type = 'semaine'
  AND COALESCE(paye, false) = false
  AND COALESCE(reste_a_percevoir, 0) = 0
  AND COALESCE(ca_brut_periode, 0) > 0
  AND COALESCE(acompte_consomme, 0) >= COALESCE(ca_brut_periode, 0);

-- 3. Vérification post-réparation
DO $$
DECLARE
  v_remaining integer;
BEGIN
  SELECT count(*) INTO v_remaining
  FROM public.bilans_status_v2
  WHERE periode_type = 'semaine'
    AND COALESCE(paye, false) = false
    AND COALESCE(reste_a_percevoir, 0) = 0
    AND COALESCE(ca_brut_periode, 0) > 0
    AND COALESCE(acompte_consomme, 0) >= COALESCE(ca_brut_periode, 0);
  
  IF v_remaining = 0 THEN
    RAISE NOTICE '✅ Réparation terminée : toutes les semaines concernées sont maintenant paye=true';
  ELSE
    RAISE WARNING '⚠️ % semaines non réparées (vérifier manuellement)', v_remaining;
  END IF;
END $$;