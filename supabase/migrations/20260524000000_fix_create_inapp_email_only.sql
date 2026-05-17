-- =============================================================================
-- Migration 20260524000000 : create_inapp_invitation – email uniquement, sans INSERT
-- =============================================================================
-- Simplification radicale : si aucun patron existant ne correspond à l'email
-- du compte Tracko ciblé, on lève une erreur plutôt que d'insérer un doublon.
--
-- Ordre de recherche dans patrons (user_id = ouvrier) :
--   1. linked_user_id = patron_user_id          → lien auth déjà établi
--   2. email = auth.users.email + linked IS NULL → même personne, pas encore liée
--                                                  → UPDATE linked_user_id
--   Si rien trouvé → RAISE EXCEPTION (message explicite)
-- =============================================================================

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
  v_target_name    text;
  v_patron_email   text;
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
    v_target_name    := v_patron_name;
  ELSE
    -- Appelant = patron, cible = ouvrier
    v_owner_id       := v_target_id;
    v_patron_user_id := v_caller_id;
    v_patron_name    := trim(COALESCE(v_caller_prenom, '') || ' ' || COALESCE(v_caller_nom, ''));
    v_inviter_name   := trim(COALESCE(v_caller_prenom, '') || ' ' || COALESCE(v_caller_nom, ''));
    v_target_name    := trim(COALESCE(v_target_prenom, '') || ' ' || COALESCE(v_target_nom, ''));
  END IF;

  IF v_patron_name  = '' THEN v_patron_name  := 'Invité'; END IF;
  IF v_inviter_name = '' THEN v_inviter_name := 'Invité'; END IF;
  IF v_target_name  = '' THEN v_target_name  := 'Invité'; END IF;

  -- Idempotence : invitation pending existante entre ces deux ?
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

  -- ── Étape 1 : correspondance exacte par linked_user_id ────────────────────
  SELECT id INTO v_patron_id
    FROM public.patrons
   WHERE user_id        = v_owner_id
     AND linked_user_id = v_patron_user_id
   LIMIT 1;

  -- ── Étape 2 : correspondance par email (auth.users) ───────────────────────
  IF v_patron_id IS NULL THEN
    SELECT email INTO v_patron_email
      FROM auth.users
     WHERE id = v_patron_user_id;

    IF v_patron_email IS NOT NULL THEN
      SELECT id INTO v_patron_id
        FROM public.patrons
       WHERE user_id        = v_owner_id
         AND linked_user_id IS NULL
         AND lower(trim(COALESCE(email, ''))) = lower(trim(v_patron_email))
       LIMIT 1;

      IF v_patron_id IS NOT NULL THEN
        UPDATE public.patrons
           SET linked_user_id = v_patron_user_id,
               actif          = true
         WHERE id = v_patron_id;
      END IF;
    END IF;
  END IF;

  -- ── Aucune correspondance → erreur explicite (pas d'INSERT) ──────────────
  IF v_patron_id IS NULL THEN
    RAISE EXCEPTION 'Aucun patron trouvé avec cet email dans votre liste. Veuillez d''abord ajouter ce patron dans vos paramètres avec son adresse email.';
  END IF;

  -- Créer l'invitation
  INSERT INTO public.patron_invitations (
    owner_id, patron_id, patron_user_id,
    invite_token, invite_expires,
    access_agenda, access_dashboard,
    initiated_by, method, status,
    inviter_name, target_name
  ) VALUES (
    v_owner_id, v_patron_id, v_patron_user_id,
    gen_random_uuid()::text,
    now() + interval '30 days',
    p_access_agenda, p_access_dashboard,
    p_initiated_by, 'in_app', 'pending',
    v_inviter_name, v_target_name
  )
  RETURNING id INTO v_inv_id;

  RETURN v_inv_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_inapp_invitation(text, text, boolean, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_inapp_invitation(text, text, boolean, boolean) TO authenticated;
