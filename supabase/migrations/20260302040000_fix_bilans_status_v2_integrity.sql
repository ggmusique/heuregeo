-- =============================================
-- FIX: bilans_status_v2 integrity
-- Objectives:
--   A) Detect & remove duplicate rows
--   B) Ensure UNIQUE constraint (idempotent)
--   C) Fix paye/reste_a_percevoir coherence
--   D) Fix RLS policies (patron-owner based)
--   E) Create acompte_allocations table (IF NOT EXISTS)
--   F) Create/replace apply_acompte function
-- =============================================

-- =============================================
-- A) DETECT DUPLICATES (diagnostic query)
-- =============================================
-- Run this first to check for duplicates:
--
-- SELECT periode_type, periode_value, patron_id, COUNT(*)
-- FROM public.bilans_status_v2
-- GROUP BY 1,2,3 HAVING COUNT(*) > 1;

-- =============================================
-- B) DEDUPLICATE + UNIQUE CONSTRAINT
-- =============================================

-- Keep only the most recently updated row per (periode_type, periode_value, patron_id).
-- Uses COALESCE to fall back to created_at then id when updated_at is absent.
DELETE FROM public.bilans_status_v2
WHERE id NOT IN (
  SELECT DISTINCT ON (periode_type, periode_value, patron_id) id
  FROM public.bilans_status_v2
  ORDER BY
    periode_type,
    periode_value,
    patron_id,
    COALESCE(updated_at, created_at, '1970-01-01'::timestamptz) DESC,
    id DESC
);

-- Add UNIQUE constraint only if it does not already exist.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'bilans_status_v2_periode_patron_unique'
      AND conrelid = 'public.bilans_status_v2'::regclass
  ) THEN
    ALTER TABLE public.bilans_status_v2
      ADD CONSTRAINT bilans_status_v2_periode_patron_unique
      UNIQUE (periode_type, periode_value, patron_id);
  END IF;
END $$;

-- =============================================
-- C) COHERENCE FIX
-- =============================================

-- If paye = true the remaining amount must be 0.
UPDATE public.bilans_status_v2
SET reste_a_percevoir = 0
WHERE paye = true
  AND (reste_a_percevoir IS NULL OR reste_a_percevoir <> 0);

-- If reste_a_percevoir = 0 AND ca_brut_periode > 0 AND acompte_consomme >= ca_brut_periode,
-- the row should logically be marked paid (normalize stale data).
UPDATE public.bilans_status_v2
SET paye = true,
    date_paiement = COALESCE(date_paiement, now())
WHERE paye IS DISTINCT FROM true
  AND reste_a_percevoir = 0
  AND ca_brut_periode > 0
  AND acompte_consomme >= ca_brut_periode;

-- =============================================
-- D) RLS POLICIES
-- =============================================

-- Ensure RLS is enabled.
ALTER TABLE public.bilans_status_v2 ENABLE ROW LEVEL SECURITY;

-- Drop old policies (by common names used in the project) to avoid conflicts.
DO $$
DECLARE
  pol_name text;
BEGIN
  FOR pol_name IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'bilans_status_v2'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.bilans_status_v2', pol_name);
  END LOOP;
END $$;

-- SELECT: any authenticated user can read rows whose patron they own
--         (or whose user_id matches theirs – covers the global patron case).
CREATE POLICY "bilans_status_v2_select"
  ON public.bilans_status_v2
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR patron_id IN (
      SELECT id FROM public.patrons WHERE user_id = auth.uid()
    )
  );

-- INSERT: authenticated user inserts their own rows for patrons they own.
CREATE POLICY "bilans_status_v2_insert"
  ON public.bilans_status_v2
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND (
      patron_id IN (SELECT id FROM public.patrons WHERE user_id = auth.uid())
    )
  );

-- UPDATE: allow when the row belongs to a patron the current user owns,
--         regardless of which user originally wrote the row (avoids blocking
--         upsert conflict-resolution when user_id on the row differs).
CREATE POLICY "bilans_status_v2_update"
  ON public.bilans_status_v2
  FOR UPDATE
  TO authenticated
  USING (
    user_id = auth.uid()
    OR patron_id IN (
      SELECT id FROM public.patrons WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    user_id = auth.uid()
    OR patron_id IN (
      SELECT id FROM public.patrons WHERE user_id = auth.uid()
    )
  );

-- DELETE: same as UPDATE.
CREATE POLICY "bilans_status_v2_delete"
  ON public.bilans_status_v2
  FOR DELETE
  TO authenticated
  USING (
    user_id = auth.uid()
    OR patron_id IN (
      SELECT id FROM public.patrons WHERE user_id = auth.uid()
    )
  );

-- =============================================
-- E) acompte_allocations TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS public.acompte_allocations (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  acompte_id       uuid        NOT NULL REFERENCES public.acomptes(id) ON DELETE CASCADE,
  bilan_id bigint REFERENCES public.bilans_status_v2(id) ON DELETE SET NULL,
  montant_applique numeric(12, 2) NOT NULL DEFAULT 0,
  applied_at       timestamptz NOT NULL DEFAULT now()
);

-- Index for fast lookup by acompte.
CREATE INDEX IF NOT EXISTS acompte_allocations_acompte_id_idx
  ON public.acompte_allocations (acompte_id);

-- RLS for acompte_allocations (read/write tied to acompte ownership).
ALTER TABLE public.acompte_allocations ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE pol_name text;
BEGIN
  FOR pol_name IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'acompte_allocations'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.acompte_allocations', pol_name);
  END LOOP;
END $$;

CREATE POLICY "acompte_allocations_select"
  ON public.acompte_allocations
  FOR SELECT TO authenticated
  USING (
    acompte_id IN (SELECT id FROM public.acomptes WHERE user_id = auth.uid())
    OR bilan_id IN (
      SELECT b.id FROM public.bilans_status_v2 b
      JOIN public.patrons p ON p.id = b.patron_id
      WHERE p.user_id = auth.uid()
    )
  );

CREATE POLICY "acompte_allocations_insert"
  ON public.acompte_allocations
  FOR INSERT TO authenticated
  WITH CHECK (
    acompte_id IN (SELECT id FROM public.acomptes WHERE user_id = auth.uid())
  );

CREATE POLICY "acompte_allocations_update"
  ON public.acompte_allocations
  FOR UPDATE TO authenticated
  USING (
    acompte_id IN (SELECT id FROM public.acomptes WHERE user_id = auth.uid())
  )
  WITH CHECK (
    acompte_id IN (SELECT id FROM public.acomptes WHERE user_id = auth.uid())
  );

CREATE POLICY "acompte_allocations_delete"
  ON public.acompte_allocations
  FOR DELETE TO authenticated
  USING (
    acompte_id IN (SELECT id FROM public.acomptes WHERE user_id = auth.uid())
  );

-- =============================================
-- F) apply_acompte FUNCTION
-- =============================================
-- Distributes an acompte across unpaid bilans_status_v2 rows,
-- oldest first, for the same patron.
-- SECURITY DEFINER bypasses RLS so the function can update any row.

CREATE OR REPLACE FUNCTION public.apply_acompte(p_acompte_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_montant      numeric;
  v_patron_id    uuid;
  v_reste        numeric;
  bilan_row      record;
  v_ca           numeric;
  v_consomme     numeric;
  v_reste_du     numeric;
  v_montant_app  numeric;
BEGIN
  -- Fetch the acompte details.
  SELECT montant, patron_id
  INTO v_montant, v_patron_id
  FROM public.acomptes
  WHERE id = p_acompte_id;

  -- Nothing to do if the acompte doesn't exist or has no amount.
  IF v_montant IS NULL OR v_montant <= 0 THEN
    RETURN;
  END IF;

  v_reste := v_montant;

  -- Iterate over unpaid bilans ordered from oldest to newest.
  FOR bilan_row IN
    SELECT id, ca_brut_periode, acompte_consomme, periode_index
    FROM public.bilans_status_v2
    WHERE patron_id = v_patron_id
      AND periode_type = 'semaine'
      AND (paye IS NULL OR paye = false)
      AND ca_brut_periode > 0
    ORDER BY periode_index ASC
  LOOP
    EXIT WHEN v_reste <= 0;

    v_ca       := COALESCE(bilan_row.ca_brut_periode, 0);
    v_consomme := COALESCE(bilan_row.acompte_consomme, 0);
    v_reste_du := GREATEST(0, v_ca - v_consomme);

    CONTINUE WHEN v_reste_du <= 0;

    -- How much of this acompte applies to this bilan.
    v_montant_app := LEAST(v_reste, v_reste_du);

    IF v_reste >= v_reste_du THEN
      -- Fully covers this bilan.
      UPDATE public.bilans_status_v2
      SET paye             = true,
          date_paiement    = now(),
          acompte_consomme = v_ca,
          reste_a_percevoir = 0
      WHERE id = bilan_row.id;
    ELSE
      -- Partially covers this bilan.
      UPDATE public.bilans_status_v2
      SET acompte_consomme  = v_consomme + v_reste,
          reste_a_percevoir = v_ca - (v_consomme + v_reste)
      WHERE id = bilan_row.id;
    END IF;

    -- Record the allocation.
    INSERT INTO public.acompte_allocations
      (acompte_id, bilan_id, montant_applique, applied_at)
    VALUES
      (p_acompte_id, bilan_row.id, v_montant_app, now());

    v_reste := v_reste - v_montant_app;
  END LOOP;
END;
$$;

-- Grant execute to authenticated users (the function is SECURITY DEFINER,
-- so it runs as the owner – no RLS bypass by callers is needed).
GRANT EXECUTE ON FUNCTION public.apply_acompte(uuid) TO authenticated;
