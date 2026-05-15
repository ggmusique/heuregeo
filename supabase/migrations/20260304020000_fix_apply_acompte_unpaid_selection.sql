-- =============================================
-- FIX: apply_acompte must allocate on real debt (reste_a_percevoir)
-- + backward-compatible schema guards for acompte_allocations.
--
-- Problem:
--   Some environments still have legacy column `montant_applique`
--   instead of `amount`, which breaks apply_acompte at runtime.
--
-- This migration:
--   1) aligns acompte_allocations schema (rename/add needed columns)
--   2) recreates apply_acompte(uuid) with debt-based selection
-- =============================================

-- 0) Schema guard: montant_applique -> amount
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'acompte_allocations'
      AND column_name = 'montant_applique'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'acompte_allocations'
      AND column_name = 'amount'
  ) THEN
    ALTER TABLE public.acompte_allocations
      RENAME COLUMN montant_applique TO amount;
  END IF;
END $$;

-- 1) Ensure expected columns exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'acompte_allocations'
      AND column_name = 'amount'
  ) THEN
    ALTER TABLE public.acompte_allocations
      ADD COLUMN amount numeric(12, 2) NOT NULL DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'acompte_allocations'
      AND column_name = 'patron_id'
  ) THEN
    ALTER TABLE public.acompte_allocations
      ADD COLUMN patron_id uuid;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'acompte_allocations'
      AND column_name = 'user_id'
  ) THEN
    ALTER TABLE public.acompte_allocations
      ADD COLUMN user_id uuid;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'acompte_allocations'
      AND column_name = 'periode_index'
  ) THEN
    ALTER TABLE public.acompte_allocations
      ADD COLUMN periode_index integer;
  END IF;
END $$;

-- 2) Backfill denormalized fields for old rows
-- 2) Backfill denormalized fields for old rows
UPDATE public.acompte_allocations
SET
  patron_id     = COALESCE(acompte_allocations.patron_id, ac.patron_id),
  user_id       = COALESCE(acompte_allocations.user_id, ac.user_id),
  periode_index = COALESCE(acompte_allocations.periode_index, b.periode_index)
FROM public.acomptes ac,
     public.bilans_status_v2 b
WHERE acompte_allocations.acompte_id = ac.id
  AND b.id = acompte_allocations.bilan_id
  AND (
    acompte_allocations.patron_id IS NULL
    OR acompte_allocations.user_id IS NULL
    OR acompte_allocations.periode_index IS NULL
  );

CREATE INDEX IF NOT EXISTS acompte_allocations_patron_periode_idx
  ON public.acompte_allocations (patron_id, periode_index);

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
    WHERE user_id       = v_user_id
      AND patron_id     = v_patron_id
      AND periode_type  = 'semaine'
      AND ca_brut_periode > 0
      AND GREATEST(
            0,
            COALESCE(reste_a_percevoir, ca_brut_periode - COALESCE(acompte_consomme, 0))
          ) > 0.01
    ORDER BY periode_index ASC
  LOOP
    EXIT WHEN v_reste <= 0;

    v_besoin := GREATEST(
      0,
      COALESCE(
        bilan_row.reste_a_percevoir,
        bilan_row.ca_brut_periode - COALESCE(bilan_row.acompte_consomme, 0)
      )
    );

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
