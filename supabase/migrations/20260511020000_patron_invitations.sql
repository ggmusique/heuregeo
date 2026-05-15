-- ============================================================
-- Migration : Table patron_invitations
-- Date      : 2026-05-11
-- ============================================================

-- ─── 0. Nettoyage des données temporaires ──────────────────
DELETE FROM public.profiles
WHERE role = 'patron'
  AND status = 'pending'
  AND id NOT IN (SELECT id FROM auth.users);

-- ─── 1. Créer la table patron_invitations ──────────────────
CREATE TABLE IF NOT EXISTS public.patron_invitations (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id      uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  patron_id     uuid        NOT NULL,
  patron_email  text        NOT NULL,
  invite_token  text        NOT NULL UNIQUE,
  invite_expires timestamptz NOT NULL,
  status        text        NOT NULL DEFAULT 'pending'
                            CHECK (status IN ('pending', 'accepted', 'expired')),
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_patron_invitations_token
  ON public.patron_invitations (invite_token)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_patron_invitations_owner
  ON public.patron_invitations (owner_id);

-- ─── 2. RLS sur patron_invitations ─────────────────────────
ALTER TABLE public.patron_invitations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "owner_manage_invitations" ON public.patron_invitations;
CREATE POLICY "owner_manage_invitations" ON public.patron_invitations
  FOR ALL USING (owner_id = auth.uid());

-- ─── 3. Fonction RPC : vérifier un token ───────────────────
DROP FUNCTION IF EXISTS public.verify_patron_invite_token(text);
CREATE OR REPLACE FUNCTION public.verify_patron_invite_token(p_token text)
RETURNS TABLE (
  invitation_id   uuid,
  owner_id        uuid,
  patron_id       uuid,
  patron_email    text,
  invite_expires  timestamptz
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
    invite_expires
  FROM public.patron_invitations
  WHERE invite_token = p_token
    AND status = 'pending'
    AND invite_expires > now()
  LIMIT 1;
$$;

-- ─── 4. Fonction RPC : activer une invitation ──────────────
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

  SELECT features INTO v_features
  FROM public.profiles
  WHERE id       = auth.uid()
    AND role     = 'patron'
    AND owner_id = v_inv.owner_id
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
    'patron',
    'active',
    v_inv.owner_id,
    v_inv.patron_id,
    v_features,
    false
  )
  ON CONFLICT (id) DO UPDATE
    SET role      = 'patron',
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