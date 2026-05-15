-- =============================================
-- FIX: apply_acompte idempotency + schema alignment
-- Objectives:
--   A) Migrate acompte_allocations to schema expected by the UI
--      (columns: amount, patron_id, periode_index, user_id)
--   B) Replace apply_acompte with idempotent version that:
--      1. Deletes existing allocations for the acompte (idempotency)
--      2. Allocates across unpaid bilans_status_v2 oldest-first
--      3. Never exceeds acompte.montant (safety assertion)
-- =============================================

-- =============================================
-- A) ALTER acompte_allocations schema
-- =============================================

-- Rename montant_applique -> amount if the old column exists and amount doesn't
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

-- Add amount column if it doesn't exist yet (fresh installs that never had montant_applique)
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
END $$;

-- Add patron_id column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'acompte_allocations'
      AND column_name = 'patron_id'
  ) THEN
    ALTER TABLE public.acompte_allocations
      ADD COLUMN patron_id uuid;
  END IF;
END $$;

-- Add periode_index column if it doesn't exist
DO $$
BEGIN
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

-- Add user_id column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'acompte_allocations'
      AND column_name = 'user_id'
  ) THEN
    ALTER TABLE public.acompte_allocations
      ADD COLUMN user_id uuid;
  END IF;
END $$;

-- Backfill patron_id and periode_index from joined tables for existing rows
UPDATE public.acompte_allocations aa
SET
  patron_id    = ac.patron_id,
  user_id      = ac.user_id,
  periode_index = b.periode_index
FROM public.acomptes ac
JOIN public.bilans_status_v2 b ON b.id = aa.bilan_id
WHERE aa.acompte_id = ac.id
  AND aa.patron_id IS NULL;

-- Index for fast patron + periode_index lookups (used by UI queries)
CREATE INDEX IF NOT EXISTS acompte_allocations_patron_periode_idx
  ON public.acompte_allocations (patron_id, periode_index);

-- =============================================
-- B) apply_acompte – idempotent, capped version
-- =============================================
-- Distributes an acompte across unpaid bilans_status_v2 rows,
-- oldest first (by periode_index ASC), for the same patron.
--
-- Idempotency: existing allocations for this acompte are deleted first,
-- and acompte_consomme on any previously touched bilans is rolled back
-- before re-allocating, so calling this function twice gives the same result.
--
-- Safety: raises an exception if the total allocated would exceed montant.
--
-- SECURITY DEFINER bypasses RLS so the function can update any row it owns.

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
  -- 1) Read the acompte
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

  -- 2) Idempotency: roll back any previous application of this acompte.
  --    For each bilan that was previously touched by this acompte,
  --    add back the amount that was taken from it.
  UPDATE public.bilans_status_v2 b
  SET
    acompte_consomme  = GREATEST(0, COALESCE(b.acompte_consomme, 0) - aa.amount),
    -- Restore reste_a_percevoir: add back the previously allocated amount, capped at ca_brut_periode
    reste_a_percevoir = LEAST(
                          b.ca_brut_periode,
                          COALESCE(b.reste_a_percevoir, 0) + aa.amount
                        ),
    paye              = false,
    date_paiement     = NULL
  FROM public.acompte_allocations aa
  WHERE aa.acompte_id = p_acompte_id
    AND aa.bilan_id   = b.id;

  -- Delete stale allocations for this acompte
  DELETE FROM public.acompte_allocations
  WHERE acompte_id = p_acompte_id;

  -- 3) Allocate across unpaid bilans, oldest first
  v_reste := v_montant;

  FOR bilan_row IN
    SELECT id, ca_brut_periode, acompte_consomme, reste_a_percevoir, periode_index
    FROM public.bilans_status_v2
    WHERE patron_id   = v_patron_id
      AND periode_type = 'semaine'
      AND (paye IS NULL OR paye = false)
      AND ca_brut_periode > 0
    ORDER BY periode_index ASC
  LOOP
    EXIT WHEN v_reste <= 0;

    v_besoin := GREATEST(0, COALESCE(bilan_row.reste_a_percevoir, bilan_row.ca_brut_periode - COALESCE(bilan_row.acompte_consomme, 0)));

    CONTINUE WHEN v_besoin <= 0;

    v_alloue := LEAST(v_reste, v_besoin);

    IF v_alloue >= v_besoin THEN
      -- Fully covers remaining debt on this bilan
      UPDATE public.bilans_status_v2
      SET acompte_consomme  = COALESCE(acompte_consomme, 0) + v_alloue,
          reste_a_percevoir = 0,
          paye              = true,
          date_paiement     = now()
      WHERE id = bilan_row.id;
    ELSE
      -- Partially covers
      UPDATE public.bilans_status_v2
      SET acompte_consomme  = COALESCE(acompte_consomme, 0) + v_alloue,
          reste_a_percevoir = v_besoin - v_alloue
      WHERE id = bilan_row.id;
    END IF;

    -- Record the allocation with denormalised patron_id / periode_index for fast UI queries
    INSERT INTO public.acompte_allocations
      (acompte_id, bilan_id, amount, patron_id, user_id, periode_index, applied_at)
    VALUES
      (p_acompte_id, bilan_row.id, v_alloue, v_patron_id, v_user_id, bilan_row.periode_index, now());

    v_reste := v_reste - v_alloue;
  END LOOP;

  -- 4) Safety assertion: total allocated must never exceed montant
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

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.apply_acompte(uuid) TO authenticated;
