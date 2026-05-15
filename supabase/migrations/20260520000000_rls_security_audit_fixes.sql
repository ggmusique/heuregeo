-- ============================================================
-- MIGRATION: RLS Security Audit Fixes
-- Date: 2026-05-20
-- Auteur: audit complet de toutes les policies RLS
--
-- CORRECTIONS:
--   1. [CRITIQUE] DROP patron_invitations.public_read_invite_by_token (qual=true)
--   2. [HIGH] Ajouter SELECT viewer pour bilans_status_v2
--   3. [HIGH] Ajouter SELECT viewer pour lieux
--   4. [HIGH] Etendre patron_read_agenda pour couvrir role='viewer'
--   5. [HIGH] Ajouter INSERT/UPDATE/DELETE owner pour acomptes
--   6. [MEDIUM] Fixer owner_insert_patron_profiles pour role='viewer'
--   7. [INFO] Supprimer les doublons viewer sur acomptes, frais_divers, frais_km, missions
-- ============================================================


-- ============================================================
-- 1. [CRITIQUE] patron_invitations.public_read_invite_by_token
--    QUAL = true → toute personne anonyme peut lire TOUTES les invitations.
--    La vérification du token passe par verify_patron_invite_token (SECURITY DEFINER).
--    Cette policy est inutile et expose tokens + emails + owner_ids.
-- ============================================================
DROP POLICY IF EXISTS "public_read_invite_by_token" ON public.patron_invitations;


-- ============================================================
-- 2. [HIGH] Viewer SELECT pour bilans_status_v2
--    Un viewer (role='viewer', status='active') peut lire les bilans
--    de son owner (son patron = owner_id dans profiles).
-- ============================================================
DROP POLICY IF EXISTS "viewer_select_bilans" ON public.bilans_status_v2;
CREATE POLICY "viewer_select_bilans"
  ON public.bilans_status_v2
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'viewer'
        AND p.status = 'active'
        AND bilans_status_v2.user_id = p.owner_id
    )
  );


-- ============================================================
-- 3. [HIGH] Viewer SELECT pour lieux
--    Nécessaire pour le Dashboard viewer (calcul km, affichage des lieux).
-- ============================================================
DROP POLICY IF EXISTS "viewer_read_lieux" ON public.lieux;
CREATE POLICY "viewer_read_lieux"
  ON public.lieux
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'viewer'
        AND p.status = 'active'
        AND lieux.user_id = p.owner_id
    )
  );


-- ============================================================
-- 4. [HIGH] agenda_events : étendre à role='viewer' avec access_agenda
--    La policy patron_read_agenda ne couvre que role='patron'.
--    On la remplace pour couvrir aussi role='viewer'.
-- ============================================================
DROP POLICY IF EXISTS "patron_read_agenda" ON public.agenda_events;
CREATE POLICY "patron_viewer_read_agenda"
  ON public.agenda_events
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('patron', 'viewer')
        AND p.status = 'active'
        AND ((p.features ->> 'access_agenda')::boolean = true)
        AND agenda_events.user_id = p.owner_id
    )
  );


-- ============================================================
-- 5. [HIGH] Acomptes : policies INSERT / UPDATE / DELETE manquantes pour l'owner
--    acomptesApi.ts appelle directement insert() et delete() sur la table.
--    Sans ces policies, les opérations sont bloquées par RLS.
-- ============================================================
DROP POLICY IF EXISTS "acomptes_insert_own" ON public.acomptes;
CREATE POLICY "acomptes_insert_own"
  ON public.acomptes
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "acomptes_update_own" ON public.acomptes;
CREATE POLICY "acomptes_update_own"
  ON public.acomptes
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "acomptes_delete_own" ON public.acomptes;
CREATE POLICY "acomptes_delete_own"
  ON public.acomptes
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());


-- ============================================================
-- 6. [MEDIUM] profiles.owner_insert_patron_profiles
--    WITH CHECK = role = 'patron' uniquement → impossible d'insérer role='viewer'.
--    On étend à IN ('patron','viewer').
--    Note: l'activation passe par activate_patron_invite (SECURITY DEFINER)
--    qui bypass déjà RLS, mais cette policy doit rester cohérente.
-- ============================================================
DROP POLICY IF EXISTS "owner_insert_patron_profiles" ON public.profiles;
CREATE POLICY "owner_insert_patron_profiles"
  ON public.profiles
  FOR INSERT
  TO public
  WITH CHECK (
    owner_id = auth.uid()
    AND role IN ('patron', 'viewer')
  );


-- ============================================================
-- 7. [INFO] Suppression des doublons viewer
--    Pas de risque sécurité, mais ils alourdissent les plans d'exécution
--    et rendent la base difficile à maintenir.
-- ============================================================

-- acomptes : "Viewer peut lire les acomptes de son patron" est un doublon de viewer_select_acomptes
DROP POLICY IF EXISTS "Viewer peut lire les acomptes de son patron" ON public.acomptes;

-- frais_divers : 3 policies identiques → on garde viewer_read_frais_divers_by_patron, on drop les 2 autres
DROP POLICY IF EXISTS "Viewer peut lire les frais divers de son patron" ON public.frais_divers;
DROP POLICY IF EXISTS "viewer_select_frais" ON public.frais_divers;

-- frais_km : 2 policies identiques → on garde viewer_read_frais_km_by_patron, on drop l'autre
DROP POLICY IF EXISTS "Viewer peut lire les frais km de son patron" ON public.frais_km;

-- missions : 2 policies identiques → on garde viewer_select_missions, on drop l'autre
DROP POLICY IF EXISTS "Viewer peut lire les missions de son patron" ON public.missions;
