-- ============================================================
-- Migration : Accès patron aux bilans
-- Date      : 2026-05-15
-- Objectif  : Aligner la policy SELECT de bilans_status_v2
--             avec le pattern patron des autres tables
-- ============================================================


DROP POLICY IF EXISTS "bilans_status_v2_select" ON public.bilans_status_v2;


CREATE POLICY "bilans_status_v2_select" ON public.bilans_status_v2
  FOR SELECT USING (
    -- L'ouvrier voit ses propres bilans
    user_id = auth.uid()
    OR
    -- Le patron voit les bilans de son ouvrier
    (
      patron_id IN (
        SELECT profiles.patron_id FROM profiles
        WHERE profiles.id       = auth.uid()
          AND profiles.role     = 'patron'
          AND profiles.status   = 'active'
      )
      AND
      user_id IN (
        SELECT profiles.owner_id FROM profiles
        WHERE profiles.id       = auth.uid()
          AND profiles.role     = 'patron'
          AND profiles.status   = 'active'
      )
    )
  );