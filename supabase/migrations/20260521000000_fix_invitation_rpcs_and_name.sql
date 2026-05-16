-- =============================================================================
-- Fix all in-app invitation RPCs + add inviter_name for display
-- =============================================================================
-- 1. accept_inapp_invitation : supprime AND owner_id IS NULL (bloquait Michel)
-- 2. refuse_inapp_invitation : SELECT first + auth check explicite
-- 3. cancel_inapp_invitation : SELECT first + auth check explicite
-- 4. Ajout colonne inviter_name pour afficher le nom sans requête profil
-- 5. create_inapp_invitation  : stocke inviter_name à la création
-- =============================================================================

-- ─── 1. Colonne inviter_name ─────────────────────────────────────────────────
ALTER TABLE public.patron_invitations
  ADD COLUMN IF NOT EXISTS inviter_name text;

-- Backfill : invitation existante 8afd9e17 (Geoffrey → Michel, initiated_by='owner')
UPDATE public.patron_invitations pi
   SET inviter_name = (
     SELECT trim(COALESCE(p.prenom, '') || ' ' || COALESCE(p.nom, ''))
       FROM public.profiles p
      WHERE p.id = pi.owner_id
   )
 WHERE pi.method = 'in_app'
   AND pi.inviter_name IS NULL
   AND pi.initiated_by = 'owner';

-- Backfill pour invitations patron-initiated (inviter = patron_user_id)
UPDATE public.patron_invitations pi
   SET inviter_name = (
     SELECT trim(COALESCE(p.prenom, '') || ' ' || COALESCE(p.nom, ''))
       FROM public.profiles p
      WHERE p.id = pi.patron_user_id
   )
 WHERE pi.method = 'in_app'
   AND pi.inviter_name IS NULL
   AND pi.initiated_by = 'patron';

-- ─── 2. create_inapp_invitation (stocke inviter_name) ───────────────────────
CREATE OR REPLACE FUNCTION public.create_inapp_invitation(
  p_target_invite_code text,
  p_initiated_by       text,    -- 'owner' | 'patron'
  p_access_agenda      boolean DEFAULT false,
  p_access_dashboard   boolean DEFAULT false
)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id      uuid := auth.uid();
  v_target_id      uuid;
  v_target_prenom  text;
  v_target_nom     text;
  v_caller_prenom  text;
  v_caller_nom     text;
  v_owner_id       uuid;
  v_patron_user_id uuid;
  v_patron_id      uuid;
  v_patron_name    text;
  v_inviter_name   text;
  v_inv_id         uuid;
BEGIN
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Utilisateur non authentifié';
  END IF;

  IF p_initiated_by NOT IN ('owner', 'patron') THEN
    RAISE EXCEPTION 'initiated_by doit être "owner" ou "patron"';
  END IF;

  -- Trouver l'utilisateur cible par son invite_code
  SELECT p.id, p.prenom, p.nom
    INTO v_target_id, v_target_prenom, v_target_nom
    FROM public.profiles p
   WHERE upper(p.invite_code) = upper(trim(p_target_invite_code))
   LIMIT 1;

  IF v_target_id IS NULL THEN
    RAISE EXCEPTION 'Code invalide : aucun utilisateur trouvé';
  END IF;

  IF v_target_id = v_caller_id THEN
    RAISE EXCEPTION 'Vous ne pouvez pas vous inviter vous-même';
  END IF;

  -- Récupérer le nom de l'appelant
  SELECT prenom, nom INTO v_caller_prenom, v_caller_nom
    FROM public.profiles WHERE id = v_caller_id;

  -- Déterminer owner / patron selon qui initie
  IF p_initiated_by = 'owner' THEN
    -- Appelant = ouvrier, cible = patron
    v_owner_id       := v_caller_id;
    v_patron_user_id := v_target_id;
    v_patron_name    := trim(COALESCE(v_target_prenom, '') || ' ' || COALESCE(v_target_nom, ''));
    v_inviter_name   := trim(COALESCE(v_caller_prenom, '') || ' ' || COALESCE(v_caller_nom, ''));
  ELSE
    -- Appelant = patron, cible = ouvrier
    v_owner_id       := v_target_id;
    v_patron_user_id := v_caller_id;
    v_patron_name    := trim(COALESCE(v_caller_prenom, '') || ' ' || COALESCE(v_caller_nom, ''));
    v_inviter_name   := trim(COALESCE(v_caller_prenom, '') || ' ' || COALESCE(v_caller_nom, ''));
  END IF;

  IF v_patron_name    = '' THEN v_patron_name  := 'Invité'; END IF;
  IF v_inviter_name   = '' THEN v_inviter_name := 'Invité'; END IF;

  -- Idempotence : invitation pending existante ?
  SELECT id INTO v_inv_id
    FROM public.patron_invitations
   WHERE owner_id       = v_owner_id
     AND patron_user_id = v_patron_user_id
     AND status         = 'pending'
     AND method         = 'in_app'
   LIMIT 1;

  IF FOUND THEN
    RETURN v_inv_id;
  END IF;

  -- Trouver ou créer l'entrée patrons
  SELECT id INTO v_patron_id
    FROM public.patrons
   WHERE user_id = v_owner_id
     AND linked_user_id = v_patron_user_id
   LIMIT 1;

  IF v_patron_id IS NULL THEN
    INSERT INTO public.patrons (user_id, nom, actif, linked_user_id)
    VALUES (v_owner_id, v_patron_name, true, v_patron_user_id)
    RETURNING id INTO v_patron_id;
  END IF;

  -- Créer l'invitation avec le nom de l'invitant
  INSERT INTO public.patron_invitations (
    owner_id, patron_id, patron_user_id,
    invite_token, invite_expires,
    access_agenda, access_dashboard,
    initiated_by, method, status,
    inviter_name
  ) VALUES (
    v_owner_id, v_patron_id, v_patron_user_id,
    gen_random_uuid()::text,
    now() + interval '30 days',
    p_access_agenda, p_access_dashboard,
    p_initiated_by, 'in_app', 'pending',
    v_inviter_name
  )
  RETURNING id INTO v_inv_id;

  RETURN v_inv_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_inapp_invitation(text, text, boolean, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_inapp_invitation(text, text, boolean, boolean) TO authenticated;

-- ─── 3. accept_inapp_invitation (fix AND owner_id IS NULL) ──────────────────
CREATE OR REPLACE FUNCTION public.accept_inapp_invitation(p_invitation_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id uuid := auth.uid();
  v_inv       patron_invitations%ROWTYPE;
  v_features  jsonb;
BEGIN
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Utilisateur non authentifié';
  END IF;

  SELECT * INTO v_inv FROM public.patron_invitations WHERE id = p_invitation_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invitation introuvable';
  END IF;

  IF v_inv.status <> 'pending' THEN
    RAISE EXCEPTION 'Invitation déjà traitée (statut : %)', v_inv.status;
  END IF;

  -- Seul le patron cible ou l'ouvrier émetteur peut accepter
  IF v_caller_id <> v_inv.patron_user_id AND v_caller_id <> v_inv.owner_id THEN
    RAISE EXCEPTION 'Non autorisé';
  END IF;

  v_features := jsonb_build_object(
    'access_agenda',    v_inv.access_agenda,
    'access_dashboard', v_inv.access_dashboard
  );

  -- Mettre à jour le profil du patron pour le lier à cet ouvrier
  -- Pas de filtre AND owner_id IS NULL : le patron peut avoir eu un accès
  -- révoqué précédemment (status='revoked') et accepte maintenant un nouveau lien
  UPDATE public.profiles
     SET owner_id   = v_inv.owner_id,
         patron_id  = v_inv.patron_id,
         role       = COALESCE(v_inv.invite_role, 'patron'),
         status     = 'active',
         features   = COALESCE(features, '{}'::jsonb) || v_features,
         updated_at = now()
   WHERE id = v_inv.patron_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profil du patron introuvable (id=%)', v_inv.patron_user_id;
  END IF;

  -- Marquer l'invitation comme acceptée
  UPDATE public.patron_invitations
     SET status = 'accepted', updated_at = now()
   WHERE id = p_invitation_id;
END;
$$;

REVOKE ALL ON FUNCTION public.accept_inapp_invitation(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.accept_inapp_invitation(uuid) TO authenticated;

-- ─── 4. refuse_inapp_invitation (SELECT first + auth check explicite) ────────
CREATE OR REPLACE FUNCTION public.refuse_inapp_invitation(p_invitation_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id uuid := auth.uid();
  v_inv       patron_invitations%ROWTYPE;
BEGIN
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Utilisateur non authentifié';
  END IF;

  SELECT * INTO v_inv FROM public.patron_invitations WHERE id = p_invitation_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invitation introuvable';
  END IF;

  IF v_inv.status <> 'pending' THEN
    RAISE EXCEPTION 'Invitation déjà traitée (statut : %)', v_inv.status;
  END IF;

  IF v_caller_id <> v_inv.patron_user_id AND v_caller_id <> v_inv.owner_id THEN
    RAISE EXCEPTION 'Non autorisé';
  END IF;

  UPDATE public.patron_invitations
     SET status = 'refused', updated_at = now()
   WHERE id = p_invitation_id;
END;
$$;

REVOKE ALL ON FUNCTION public.refuse_inapp_invitation(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.refuse_inapp_invitation(uuid) TO authenticated;

-- ─── 5. cancel_inapp_invitation (SELECT first + auth check explicite) ────────
CREATE OR REPLACE FUNCTION public.cancel_inapp_invitation(p_invitation_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id uuid := auth.uid();
  v_inv       patron_invitations%ROWTYPE;
BEGIN
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Utilisateur non authentifié';
  END IF;

  SELECT * INTO v_inv FROM public.patron_invitations WHERE id = p_invitation_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invitation introuvable';
  END IF;

  IF v_inv.status <> 'pending' THEN
    RAISE EXCEPTION 'Invitation déjà traitée (statut : %)', v_inv.status;
  END IF;

  IF v_caller_id <> v_inv.patron_user_id AND v_caller_id <> v_inv.owner_id THEN
    RAISE EXCEPTION 'Non autorisé';
  END IF;

  UPDATE public.patron_invitations
     SET status = 'cancelled', updated_at = now()
   WHERE id = p_invitation_id;
END;
$$;

REVOKE ALL ON FUNCTION public.cancel_inapp_invitation(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cancel_inapp_invitation(uuid) TO authenticated;
