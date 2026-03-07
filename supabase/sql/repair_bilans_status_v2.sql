-- =============================================
-- RÉPARATION bilans_status_v2 – invariant paye <=> reste=0
-- =============================================
-- Objectif : corriger l'historique existant pour respecter :
--   paye=true  => reste_a_percevoir = 0
--   reste_a_percevoir <= 0.01 => paye = true (+ date_paiement non null)
--
-- À exécuter manuellement sur la base Supabase.
-- =============================================

-- 1) Si paye=true mais reste_a_percevoir != 0 → forcer reste à 0
UPDATE public.bilans_status_v2
SET reste_a_percevoir = 0
WHERE paye = true
  AND (reste_a_percevoir IS NULL OR reste_a_percevoir > 0.01);

-- 2) Si reste_a_percevoir <= 0.01 et paye n'est pas encore true → marquer payé
UPDATE public.bilans_status_v2
SET paye          = true,
    date_paiement = COALESCE(date_paiement, now())
WHERE (paye IS DISTINCT FROM true)
  AND reste_a_percevoir IS NOT NULL
  AND reste_a_percevoir <= 0.01
  AND ca_brut_periode > 0;

-- =============================================
-- VÉRIFICATION (requête de diagnostic)
-- =============================================
-- Après exécution, cette requête doit retourner 0 lignes :
--
-- SELECT id, periode_value, patron_id, paye, reste_a_percevoir
-- FROM public.bilans_status_v2
-- WHERE (paye = true AND reste_a_percevoir > 0.01)
--    OR (paye IS DISTINCT FROM true AND reste_a_percevoir <= 0.01 AND ca_brut_periode > 0);
