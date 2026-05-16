-- Fix: supprimer les filtres AND p.owner_id IS NULL dans create_inapp_invitation
-- Ces filtres bloquaient les utilisateurs dont owner_id n'est pas NULL
-- (ex. Michel avec owner_id = uuid_patron, Geoffrey avec owner_id = self)

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
  v_inv_id         uuid;
BEGIN
  -- Validation
  IF p_initiated_by NOT IN ('owner', 'patron') THEN
    RAISE EXCEPTION 'initiated_by doit être "owner" ou "patron"';
  END IF;

  -- Trouver l'utilisateur cible par son invite_code (sans filtre owner_id)
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

  -- Récupérer le nom de l'appelant (sans filtre owner_id)
  SELECT prenom, nom INTO v_caller_prenom, v_caller_nom
    FROM public.profiles WHERE id = v_caller_id;

  -- Déterminer owner / patron selon qui initie
  IF p_initiated_by = 'owner' THEN
    -- Appelant = ouvrier, cible = patron
    v_owner_id       := v_caller_id;
    v_patron_user_id := v_target_id;
    v_patron_name    := trim(COALESCE(v_target_prenom, '') || ' ' || COALESCE(v_target_nom, ''));
  ELSE
    -- Appelant = patron, cible = ouvrier
    v_owner_id       := v_target_id;
    v_patron_user_id := v_caller_id;
    v_patron_name    := trim(COALESCE(v_caller_prenom, '') || ' ' || COALESCE(v_caller_nom, ''));
  END IF;

  IF v_patron_name = '' THEN v_patron_name := 'Invité'; END IF;

  -- Vérifier si une invitation in-app pending existe déjà entre ces deux
  SELECT id INTO v_inv_id
    FROM public.patron_invitations
   WHERE owner_id       = v_owner_id
     AND patron_user_id = v_patron_user_id
     AND status         = 'pending'
     AND method         = 'in_app'
   LIMIT 1;

  IF FOUND THEN
    -- Renvoyer l'ID existant (idempotent)
    RETURN v_inv_id;
  END IF;

  -- Trouver ou créer l'entrée patrons correspondant à ce patron
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

  -- Créer l'invitation
  INSERT INTO public.patron_invitations (
    owner_id, patron_id, patron_user_id,
    invite_token, invite_expires,
    access_agenda, access_dashboard,
    initiated_by, method, status
  ) VALUES (
    v_owner_id, v_patron_id, v_patron_user_id,
    gen_random_uuid()::text,
    now() + interval '30 days',
    p_access_agenda, p_access_dashboard,
    p_initiated_by, 'in_app', 'pending'
  )
  RETURNING id INTO v_inv_id;

  RETURN v_inv_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_inapp_invitation(text, text, boolean, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_inapp_invitation(text, text, boolean, boolean) TO authenticated;
