-- =============================================
-- Migration: UNIQUE constraint on bilans_status_v2
-- Prevents duplicate rows for (periode_type, periode_value, patron_id)
-- which caused payment status read bugs.
-- =============================================

-- Remove any existing duplicates before adding the constraint:
-- For each group (periode_type, periode_value, patron_id), keep the
-- most recent row (created_at DESC) and delete the others.
DELETE FROM public.bilans_status_v2
WHERE id NOT IN (
  SELECT DISTINCT ON (periode_type, periode_value, patron_id) id
  FROM public.bilans_status_v2
  ORDER BY periode_type, periode_value, patron_id, created_at DESC
);

-- Add UNIQUE constraint
ALTER TABLE public.bilans_status_v2
  ADD CONSTRAINT bilans_status_v2_periode_patron_unique
  UNIQUE (periode_type, periode_value, patron_id);
