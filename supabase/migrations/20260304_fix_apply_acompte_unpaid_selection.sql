-- =============================================
-- FIX: apply_acompte must allocate on real debt (reste_a_percevoir)
--
-- Problem:
--   Some legacy rows can be inconsistent: paye=true but reste_a_percevoir > 0.
--   In that case, filtering only on paye=false skips rows that still carry debt,
--   so acompte allocation misses unpaid balances.
--
-- Fix:
--   Select weekly rows with a positive remaining debt directly:
--     GREATEST(0, COALESCE(reste_a_percevoir, ca_brut_periode - acompte_consomme)) > 0.01
-- =============================================

CREATE OR REPLACE FUNCTION public.apply_acompte(p_acompte_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_montant      numeric;
  v_patron_id    uuid;
  v_user_id      uuid;
  v_reste        numeric;
  bilan_row      record;
  v_besoin       numeric;
  v_alloue       numeric;
  v_total_check  numeric;
BEGIN
  SELECT montant, patron_id, user_id
  INTO v_montant, v_patron_id, v_user_id
  FROM public.acomptes
  WHERE id = p_acompte_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'apply_acompte: acompte % not found', p_acompte_id;
  END IF;

  IF v_montant IS NULL OR v_montant <= 0 THEN
    RETURN;
  END IF;

  UPDATE public.bilans_status_v2 b
  SET
    acompte_consomme  = GREATEST(0, COALESCE(b.acompte_consomme, 0) - aa.amount),
    reste_a_percevoir = LEAST(
                          b.ca_brut_periode,
                          COALESCE(b.reste_a_percevoir, 0) + aa.amount
                        ),
    paye              = false,
    date_paiement     = NULL
  FROM public.acompte_allocations aa
  WHERE aa.acompte_id = p_acompte_id
    AND aa.bilan_id   = b.id;

  DELETE FROM public.acompte_allocations
  WHERE acompte_id = p_acompte_id;

  v_reste := v_montant;

  FOR bilan_row IN
    SELECT id, ca_brut_periode, acompte_consomme, reste_a_percevoir, periode_index
    FROM public.bilans_status_v2
    WHERE patron_id    = v_patron_id
      AND periode_type = 'semaine'
      AND ca_brut_periode > 0
      AND GREATEST(
            0,
            COALESCE(reste_a_percevoir, ca_brut_periode - COALESCE(acompte_consomme, 0))
          ) > 0.01
    ORDER BY periode_index ASC
  LOOP
    EXIT WHEN v_reste <= 0;

    v_besoin := GREATEST(0, COALESCE(bilan_row.reste_a_percevoir, bilan_row.ca_brut_periode - COALESCE(bilan_row.acompte_consomme, 0)));

    CONTINUE WHEN v_besoin <= 0;

    v_alloue := LEAST(v_reste, v_besoin);

    IF v_alloue >= v_besoin THEN
      UPDATE public.bilans_status_v2
      SET acompte_consomme  = COALESCE(acompte_consomme, 0) + v_alloue,
          reste_a_percevoir = 0,
          paye              = true,
          date_paiement     = now()
      WHERE id = bilan_row.id;
    ELSE
      UPDATE public.bilans_status_v2
      SET acompte_consomme  = COALESCE(acompte_consomme, 0) + v_alloue,
          reste_a_percevoir = v_besoin - v_alloue,
          paye              = false,
          date_paiement     = NULL
      WHERE id = bilan_row.id;
    END IF;

    INSERT INTO public.acompte_allocations
      (acompte_id, bilan_id, amount, patron_id, user_id, periode_index, applied_at)
    VALUES
      (p_acompte_id, bilan_row.id, v_alloue, v_patron_id, v_user_id, bilan_row.periode_index, now());

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
END;
$$;

GRANT EXECUTE ON FUNCTION public.apply_acompte(uuid) TO authenticated;
