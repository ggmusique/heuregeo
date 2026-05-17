-- =============================================================================
-- Migration 20260517040000 : éviter les doublons dans la table patrons
-- =============================================================================
-- Problème : create_inapp_invitation cherche le patron par
--   (user_id = ouvrier, linked_user_id = patron_user_id).
-- Si l'ouvrier avait saisi le patron manuellement (linked_user_id IS NULL),
-- la recherche retourne NULL et un second enregistrement est inséré.
--
-- Solution :
--   1. Chercher d'abord par (user_id, linked_user_id)          → correspondance exacte
--   2. Si non trouvé, chercher par (user_id, nom ILIKE, linked_user_id IS NULL)
--      → rattacher l'entrée existante en mettant à jour linked_user_id
--   3. Seulement si aucune correspondance : insérer un nouveau patron
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

  IF v_patron_name  = '' THEN v_patron_name  := 'Invité'; END IF;
  IF v_inviter_name = '' THEN v_inviter_name := 'Invité'; END IF;

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

  -- ── Trouver ou créer l'entrée patrons (sans doublon) ──────────────────────

  -- Étape 1 : correspondance exacte par linked_user_id
  SELECT id INTO v_patron_id
    FROM public.patrons
   WHERE user_id        = v_owner_id
     AND linked_user_id = v_patron_user_id
   LIMIT 1;

  IF v_patron_id IS NULL THEN
    -- Étape 2 : patron saisi manuellement (linked_user_id IS NULL) avec nom similaire
    SELECT id INTO v_patron_id
      FROM public.patrons
     WHERE user_id        = v_owner_id
       AND linked_user_id IS NULL
       AND lower(trim(nom)) = lower(trim(v_patron_name))
     LIMIT 1;

    IF v_patron_id IS NOT NULL THEN
      -- Rattacher l'entrée existante au compte Tracko du patron
      UPDATE public.patrons
         SET linked_user_id = v_patron_user_id,
             actif          = true
       WHERE id = v_patron_id;
    END IF;
  END IF;

  IF v_patron_id IS NULL THEN
    -- Étape 3 : aucun patron trouvé → insérer
    INSERT INTO public.patrons (user_id, nom, actif, linked_user_id)
    VALUES (v_owner_id, v_patron_name, true, v_patron_user_id)
    RETURNING id INTO v_patron_id;
  END IF;

  -- Créer l'invitation
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
