-- ============================================================
-- Migration : Rôle dynamique dans les invitations
-- Date      : 2026-05-15
-- Objectif  : Supporter 'patron' et 'viewer' dans le flux d'invitation
-- ============================================================

-- ─── 1. Ajouter la colonne invite_role ──────────────────────────────────────
ALTER TABLE public.patron_invitations
  ADD COLUMN IF NOT EXISTS invite_role text NOT NULL DEFAULT 'patron'
    CHECK (invite_role IN ('patron', 'viewer'));

-- ─── 2. Mettre à jour verify_patron_invite_token ────────────────────────────
-- Retourne désormais aussi invite_role afin que AcceptInvitePage puisse
-- savoir quel rôle sera créé à l'activation.

DROP FUNCTION IF EXISTS public.verify_patron_invite_token(text);
CREATE OR REPLACE FUNCTION public.verify_patron_invite_token(p_token text)
RETURNS TABLE (
  invitation_id   uuid,
  owner_id        uuid,
  patron_id       uuid,
  patron_email    text,
  invite_expires  timestamptz,
  invite_role     text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    id              AS invitation_id,
    owner_id,
    patron_id,
    patron_email,
    invite_expires,
    invite_role
  FROM public.patron_invitations
  WHERE invite_token = p_token
    AND status = 'pending'
    AND invite_expires > now()
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.verify_patron_invite_token(text) TO anon, authenticated;

-- ─── 3. Mettre à jour activate_patron_invite ────────────────────────────────
-- Utilise v_inv.invite_role au lieu du rôle 'patron' hardcodé.

DROP FUNCTION IF EXISTS public.activate_patron_invite(text);
CREATE OR REPLACE FUNCTION public.activate_patron_invite(p_token text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inv       public.patron_invitations%ROWTYPE;
  v_features  jsonb;
BEGIN
  SELECT * INTO v_inv
  FROM public.patron_invitations
  WHERE invite_token = p_token
    AND status = 'pending'
    AND invite_expires > now()
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invitation invalide ou expirée';
  END IF;

  v_features := jsonb_build_object(
    'access_agenda',    false,
    'access_dashboard', false
  );

  -- Récupérer les features existantes si une ligne de profil existe déjà
  SELECT features INTO v_features
  FROM public.profiles
  WHERE id        = auth.uid()
    AND role      = v_inv.invite_role
    AND owner_id  = v_inv.owner_id
    AND patron_id = v_inv.patron_id
  LIMIT 1;

  IF v_features IS NULL THEN
    v_features := jsonb_build_object(
      'access_agenda',    false,
      'access_dashboard', false
    );
  END IF;

  INSERT INTO public.profiles (id, role, status, owner_id, patron_id, features, is_admin)
  VALUES (
    auth.uid(),
    v_inv.invite_role,   -- ← dynamique : 'patron' ou 'viewer'
    'active',
    v_inv.owner_id,
    v_inv.patron_id,
    v_features,
    false
  )
  ON CONFLICT (id) DO UPDATE
    SET role      = v_inv.invite_role,
        status    = 'active',
        owner_id  = v_inv.owner_id,
        patron_id = v_inv.patron_id,
        features  = EXCLUDED.features;

  UPDATE public.patron_invitations
  SET status     = 'accepted',
      updated_at = now()
  WHERE id = v_inv.id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.activate_patron_invite(text) TO authenticated;
