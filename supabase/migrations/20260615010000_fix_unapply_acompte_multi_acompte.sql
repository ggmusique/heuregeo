-- =============================================================================
-- Migration : Fix unapply_acompte — multi-acompte support
-- Date      : 2026-06-15
-- Auteur    : Correction bug suppression acompte
-- =============================================================================
-- PROBLÈME :
--   unapply_acompte met paye = false sur TOUTES les semaines allouées
--   par l'acompte supprimé, sans vérifier si d'autres acomptes
--   couvrent encore ces semaines.
--
-- CORRECTIF :
--   Après avoir soustrait l'allocation, on vérifie si la semaine
--   reste entièrement couverte (acompte_consomme >= ca_brut_periode).
--   Si OUI → on garde paye = true. Si NON → paye = false.
--
-- NOTE : Le rollback interne de apply_acompte a déjà la protection
--   "AND COALESCE(b.paye, false) = false" mais unapply_acompte
--   ne l'avait pas. Cette correction aligne les deux comportements.
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
  -- CORRECTION : ne mettre paye = false QUE si la semaine n'est plus entièrement couverte
  FOR deleted_alloc IN
    DELETE FROM public.acompte_allocations aa
    WHERE aa.acompte_id = p_acompte_id
    RETURNING aa.bilan_id, aa.amount
  LOOP
    UPDATE public.bilans_status_v2 b
    SET
      acompte_consomme  = GREATEST(0, COALESCE(b.acompte_consomme, 0) - deleted_alloc.amount),
      reste_a_percevoir = GREATEST(0, COALESCE(b.reste_a_percevoir, 0) + deleted_alloc.amount),
      -- NOUVEAU : ne passe paye=false que si plus assez d'acompte pour couvrir le CA
      paye              = CASE 
                            WHEN COALESCE(b.acompte_consomme, 0) - deleted_alloc.amount >= COALESCE(b.ca_brut_periode, 0)
                            THEN true   -- encore entièrement couvert par d'autres acomptes
                            ELSE false  -- plus entièrement couvert
                          END,
      date_paiement     = CASE 
                            WHEN COALESCE(b.acompte_consomme, 0) - deleted_alloc.amount >= COALESCE(b.ca_brut_periode, 0)
                            THEN b.date_paiement   -- garde la date de paiement
                            ELSE NULL
                          END
    WHERE b.id = deleted_alloc.bilan_id;

    v_total_annule := v_total_annule + deleted_alloc.amount;
  END LOOP;

  RAISE NOTICE 'unapply_acompte done: acompte %, montant_annule %',
    p_acompte_id, v_total_annule;
END;
$$;

GRANT EXECUTE ON FUNCTION public.unapply_acompte(uuid) TO authenticated;