-- apply_acompte: strict idempotence + safe candidate selection + row locks
-- Source of truth: apply_acompte + acompte_allocations

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
  v_besoin       numeric;
  v_alloue       numeric;
  v_total_check  numeric;
  v_now          timestamptz := now();
  bilan_row      record;
  deleted_alloc  record;
BEGIN
  SELECT montant, patron_id, user_id
  INTO v_montant, v_patron_id, v_user_id
  FROM public.acomptes
  WHERE id = p_acompte_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'apply_acompte: acompte % not found', p_acompte_id;
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

CREATE INDEX IF NOT EXISTS acompte_allocations_acompte_created_idx
  ON public.acompte_allocations (acompte_id, created_at);
