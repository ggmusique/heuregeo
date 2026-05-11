-- ============================================================
-- Migration : Accès Patron — Policies RLS
-- Date      : 2026-05-11
-- Prérequis : colonnes owner_id, patron_id, status, role
--             déjà présentes dans public.profiles
-- ============================================================

-- ─── 0. Extensions nécessaires (crypto pour uuid) ────────────────────────────
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ─── 1. profiles ─────────────────────────────────────────────────────────────
-- L'ouvrier voit ses propres profils + ceux des patrons qu'il a invités
-- Le patron voit son propre profil

DROP POLICY IF EXISTS "patron_see_own_profiles" ON public.profiles;
CREATE POLICY "patron_see_own_profiles" ON public.profiles
  FOR SELECT USING (
    id = auth.uid()
    OR owner_id = auth.uid()
  );

-- L'ouvrier peut mettre à jour les profils patrons qu'il possède (toggle features)
DROP POLICY IF EXISTS "owner_update_patron_profiles" ON public.profiles;
CREATE POLICY "owner_update_patron_profiles" ON public.profiles
  FOR UPDATE USING (
    owner_id = auth.uid()
  );

-- ─── 2. missions ─────────────────────────────────────────────────────────────
-- Le patron actif voit les missions liées à son patron_id chez son ouvrier

DROP POLICY IF EXISTS "patron_read_missions" ON public.missions;
CREATE POLICY "patron_read_missions" ON public.missions
  FOR SELECT USING (
    user_id = auth.uid()
    OR (
      patron_id IN (
        SELECT patron_id FROM public.profiles
        WHERE id = auth.uid()
          AND role = 'patron'
          AND status = 'active'
      )
      AND user_id IN (
        SELECT owner_id FROM public.profiles
        WHERE id = auth.uid()
          AND role = 'patron'
          AND status = 'active'
      )
    )
  );

-- ─── 3. bilans_status_v2 ─────────────────────────────────────────────────────
DROP POLICY IF EXISTS "patron_read_bilans" ON public.bilans_status_v2;
CREATE POLICY "patron_read_bilans" ON public.bilans_status_v2
  FOR SELECT USING (
    user_id = auth.uid()
    OR (
      patron_id IN (
        SELECT patron_id FROM public.profiles
        WHERE id = auth.uid()
          AND role = 'patron'
          AND status = 'active'
      )
      AND user_id IN (
        SELECT owner_id FROM public.profiles
        WHERE id = auth.uid()
          AND role = 'patron'
          AND status = 'active'
      )
    )
  );

-- ─── 4. clients ──────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "patron_read_clients" ON public.clients;
CREATE POLICY "patron_read_clients" ON public.clients
  FOR SELECT USING (
    user_id = auth.uid()
    OR user_id IN (
      SELECT owner_id FROM public.profiles
      WHERE id = auth.uid()
        AND role = 'patron'
        AND status = 'active'
    )
  );

-- ─── 5. lieux ────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "patron_read_lieux" ON public.lieux;
CREATE POLICY "patron_read_lieux" ON public.lieux
  FOR SELECT USING (
    user_id = auth.uid()
    OR user_id IN (
      SELECT owner_id FROM public.profiles
      WHERE id = auth.uid()
        AND role = 'patron'
        AND status = 'active'
    )
  );

-- ─── 6. frais_km ────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "patron_read_frais_km" ON public.frais_km;
CREATE POLICY "patron_read_frais_km" ON public.frais_km
  FOR SELECT USING (
    user_id = auth.uid()
    OR (
      patron_id IN (
        SELECT patron_id FROM public.profiles
        WHERE id = auth.uid()
          AND role = 'patron'
          AND status = 'active'
      )
      AND user_id IN (
        SELECT owner_id FROM public.profiles
        WHERE id = auth.uid()
          AND role = 'patron'
          AND status = 'active'
      )
    )
  );

-- ─── 7. frais_divers ─────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "patron_read_frais_divers" ON public.frais_divers;
CREATE POLICY "patron_read_frais_divers" ON public.frais_divers
  FOR SELECT USING (
    user_id = auth.uid()
    OR (
      patron_id IN (
        SELECT patron_id FROM public.profiles
        WHERE id = auth.uid()
          AND role = 'patron'
          AND status = 'active'
      )
      AND user_id IN (
        SELECT owner_id FROM public.profiles
        WHERE id = auth.uid()
          AND role = 'patron'
          AND status = 'active'
      )
    )
  );

-- ─── 8. acomptes ─────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "patron_read_acomptes" ON public.acomptes;
CREATE POLICY "patron_read_acomptes" ON public.acomptes
  FOR SELECT USING (
    user_id = auth.uid()
    OR (
      patron_id IN (
        SELECT patron_id FROM public.profiles
        WHERE id = auth.uid()
          AND role = 'patron'
          AND status = 'active'
      )
      AND user_id IN (
        SELECT owner_id FROM public.profiles
        WHERE id = auth.uid()
          AND role = 'patron'
          AND status = 'active'
      )
    )
  );

-- ─── 9. agenda_events (conditionné à features.access_agenda) ─────────────────
DROP POLICY IF EXISTS "patron_read_agenda" ON public.agenda_events;
CREATE POLICY "patron_read_agenda" ON public.agenda_events
  FOR SELECT USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'patron'
        AND p.status = 'active'
        AND (p.features->>'access_agenda')::boolean = true
        AND agenda_events.user_id = p.owner_id
    )
  );

-- ─── 10. Fonction helper : générer un token d'invitation ─────────────────────
CREATE OR REPLACE FUNCTION public.generate_invite_token()
RETURNS text LANGUAGE sql SECURITY DEFINER AS $$
  SELECT encode(gen_random_bytes(32), 'hex');
$$;
