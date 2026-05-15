-- =============================================
-- Migration : ajout du rôle viewer dans profiles
-- =============================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'owner',
  ADD COLUMN IF NOT EXISTS owner_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS patron_id uuid REFERENCES public.patrons(id) ON DELETE SET NULL;

CREATE POLICY "Viewer peut lire les missions de son patron"
  ON public.missions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'viewer'
        AND p.patron_id = missions.patron_id
    )
  );

CREATE POLICY "Viewer peut lire les frais divers de son patron"
  ON public.frais_divers FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'viewer'
        AND p.patron_id = frais_divers.patron_id
    )
  );

CREATE POLICY "Viewer peut lire les frais km de son patron"
  ON public.frais_km FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'viewer'
        AND p.patron_id = frais_km.patron_id
    )
  );

CREATE POLICY "Viewer peut lire les acomptes de son patron"
  ON public.acomptes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'viewer'
        AND p.patron_id = acomptes.patron_id
    )
  );

CREATE POLICY "Viewer peut lire les bilans de son patron"
  ON public.bilans_status_v2 FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'viewer'
        AND p.patron_id = bilans_status_v2.patron_id
    )
  );