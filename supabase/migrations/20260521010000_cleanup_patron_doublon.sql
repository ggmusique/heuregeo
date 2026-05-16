-- =============================================================================
-- Cleanup patron doublon + fix create_inapp_invitation pour éviter les doublons
-- =============================================================================
-- Contexte : create_inapp_invitation a créé un doublon "Michel Lamproye"
-- (489e79b6) car le patron original (8ac96ed0) avait linked_user_id = NULL.
-- Ce script :
--   1. Rattache l'invitation au bon patron (8ac96ed0, 5 missions)
--   2. Met linked_user_id sur le patron original
--   3. Supprime le doublon (489e79b6, 0 missions)
--   4. Corrige create_inapp_invitation pour chercher d'abord par nom
-- =============================================================================

-- ─── 1. Rattacher l'invitation au patron original (avec les missions) ─────────
UPDATE public.patron_invitations
   SET patron_id = '8ac96ed0-1ff8-4532-b38d-be4da8b5818e'
 WHERE patron_id = '489e79b6-cd83-4379-a794-c72a520fe3f0';

-- ─── 2. Supprimer le doublon EN PREMIER (libère la clé unique) ───────────────
DELETE FROM public.patrons
 WHERE id = '489e79b6-cd83-4379-a794-c72a520fe3f0';

-- ─── 3. Lier le patron original à Michel APRÈS la suppression ────────────────
UPDATE public.patrons
   SET linked_user_id = 'a2078de7-1423-4613-b7df-b0a23c0c5253'
 WHERE id = '8ac96ed0-1ff8-4532-b38d-be4da8b5818e'
   AND linked_user_id IS NULL;

-- ─── 4. Corriger create_inapp_invitation : cherche patron existant par nom ───
-- Si un patron avec le même nom et linked_user_id IS NULL existe déjà sous
-- cet owner, on le réutilise et on lui attribue linked_user_id au lieu de
-- créer un doublon.
CREATE OR REPLACE FUNCTION public.create_inapp_invitation(
  p_target_invite_code text,
  p_initiated_by       text,
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
    v_owner_id       := v_caller_id;
    v_patron_user_id := v_target_id;
    v_patron_name    := trim(COALESCE(v_target_prenom, '') || ' ' || COALESCE(v_target_nom, ''));
    v_inviter_name   := trim(COALESCE(v_caller_prenom, '') || ' ' || COALESCE(v_caller_nom, ''));
  ELSE
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

  -- ── Trouver ou créer l'entrée patrons ───────────────────────────────────────
  -- 1. Cherche par linked_user_id (lien auth déjà établi)
  SELECT id INTO v_patron_id
    FROM public.patrons
   WHERE user_id        = v_owner_id
     AND linked_user_id = v_patron_user_id
   LIMIT 1;

  -- 2. Sinon cherche par nom exact parmi les patrons sans lien auth
  --    (évite de créer un doublon quand le patron existait avant le système in-app)
  IF v_patron_id IS NULL THEN
    SELECT id INTO v_patron_id
      FROM public.patrons
     WHERE user_id        = v_owner_id
       AND linked_user_id IS NULL
       AND lower(trim(nom)) = lower(trim(v_patron_name))
     LIMIT 1;

    -- Lier ce patron existant à l'utilisateur auth pour les prochaines fois
    IF v_patron_id IS NOT NULL THEN
      UPDATE public.patrons
         SET linked_user_id = v_patron_user_id
       WHERE id = v_patron_id;
    END IF;
  END IF;

  -- 3. Toujours pas trouvé → créer
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
