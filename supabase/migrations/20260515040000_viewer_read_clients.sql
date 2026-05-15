-- ============================================================
-- Migration : Accès Viewer — Policy RLS table clients
-- Date      : 2026-05-15
-- Prérequis : role 'viewer', status 'active', owner_id dans profiles
-- ============================================================

-- Le viewer peut lire les clients appartenant à son ouvrier (owner)
DROP POLICY IF EXISTS "viewer_read_clients" ON public.clients;
CREATE POLICY "viewer_read_clients" ON public.clients
  FOR SELECT USING (
    user_id IN (
      SELECT owner_id FROM public.profiles
      WHERE id = auth.uid()
        AND role = 'viewer'
        AND status = 'active'
    )
  );
