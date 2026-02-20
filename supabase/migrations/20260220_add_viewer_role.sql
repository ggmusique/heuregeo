-- =============================================
-- Migration : ajout du rôle viewer dans profiles
-- =============================================

-- 1. Ajout des colonnes de rôle dans profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'owner',
  -- owner_id: references the owner profile that created this viewer account
  ADD COLUMN IF NOT EXISTS owner_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  -- patron_id: for viewers, the patron they are allowed to see (must match a patrons.id)
  ADD COLUMN IF NOT EXISTS patron_id uuid REFERENCES public.patrons(id) ON DELETE SET NULL;

-- 2. RLS existante pour owner : inchangée (Utilisateur gère son propre profil)

-- 3. Policy lecture viewer : missions
-- Un viewer peut lire les missions dont le patron_id correspond à son patron_id
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

-- 4. Policy lecture viewer : frais
CREATE POLICY "Viewer peut lire les frais de son patron"
  ON public.frais FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'viewer'
        AND p.patron_id = frais.patron_id
    )
  );

-- 5. Policy lecture viewer : acomptes
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

-- 6. Policy lecture viewer : bilans_status_v2
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
