-- =============================================================================
-- Migration 20260521020000 : target_name + réparation profil Michel
-- =============================================================================
-- Problèmes corrigés :
--  1. patron_id = NULL sur le profil de Michel (FK ON DELETE SET NULL causé par
--     la suppression du doublon 489e79b6 dans la migration précédente alors que
--     Michel avait accepté 8afd9e17 avec ce patron_id).
--  2. Colonne target_name absente : impossible d'afficher le nom de l'ouvrier
--     côté patron dans les invitations envoyées (on ne stockait que inviter_name).
-- =============================================================================

-- ─── 1. Colonne target_name ────────────────────────────────────────────────────
ALTER TABLE public.patron_invitations
  ADD COLUMN IF NOT EXISTS target_name text;

-- ─── 2. Réparer profil Michel ──────────────────────────────────────────────────
-- patron_id est tombé à NULL car create_inapp_invitation avait créé le doublon
-- 489e79b6 (supprimé migration 20260521010000) et Michel l'avait accepté.
UPDATE public.profiles
   SET patron_id = '8ac96ed0-1ff8-4532-b38d-be4da8b5818e'
 WHERE id       = 'a2078de7-1423-4613-b7df-b0a23c0c5253'
   AND patron_id IS NULL
   AND owner_id  = 'e81058de-cf30-49a1-850f-c9cf5099f21d'
   AND status    = 'active';

-- ─── 3. Backfill target_name : toutes les invitations in_app existantes ────────
-- target_name = nom de l'ouvrier (owner_id → profiles)
UPDATE public.patron_invitations pi
   SET target_name = (
     SELECT trim(COALESCE(pr.prenom, '') || ' ' || COALESCE(pr.nom, ''))
       FROM public.profiles pr
      WHERE pr.id = pi.owner_id
   )
 WHERE pi.target_name IS NULL
   AND pi.method = 'in_app';

-- ─── 4. create_inapp_invitation : ajouter target_name ─────────────────────────
CREATE OR REPLACE FUNCTION public.create_inapp_invitation(
  p_target_invite_code text,
  p_initiated_by       text,
  p_access_agenda      boolean DEFAULT false,
  p_access_dashboard   boolean DEFAULT false
) RETURNS uuid
  LANGUAGE plpgsql
  SECURITY DEFINER
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

  -- Noms cible et invitant
  v_target_name  := trim(COALESCE(v_target_prenom, '') || ' ' || COALESCE(v_target_nom, ''));
  v_inviter_name := trim(COALESCE(v_caller_prenom, '') || ' ' || COALESCE(v_caller_nom, ''));

  -- Déterminer owner / patron selon qui initie
  IF p_initiated_by = 'owner' THEN
    -- L'ouvrier (caller) invite le patron (target)
    v_owner_id       := v_caller_id;
    v_patron_user_id := v_target_id;
    v_patron_name    := v_target_name;
  ELSE
    -- Le patron (caller) invite l'ouvrier (target)
    v_owner_id       := v_target_id;
    v_patron_user_id := v_caller_id;
    v_patron_name    := v_inviter_name;
  END IF;

  IF v_patron_name  = '' THEN v_patron_name  := 'Invité'; END IF;
  IF v_inviter_name = '' THEN v_inviter_name := 'Invité'; END IF;
  IF v_target_name  = '' THEN v_target_name  := 'Invité'; END IF;

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

  -- ── Trouver ou créer l'entrée patrons ──────────────────────────────────────
  -- 1. Cherche par linked_user_id (lien auth déjà établi)
  SELECT id INTO v_patron_id
    FROM public.patrons
   WHERE user_id        = v_owner_id
     AND linked_user_id = v_patron_user_id
   LIMIT 1;

  -- 2. Sinon cherche par nom exact parmi les patrons sans lien auth
  IF v_patron_id IS NULL THEN
    SELECT id INTO v_patron_id
      FROM public.patrons
     WHERE user_id        = v_owner_id
       AND linked_user_id IS NULL
       AND lower(trim(nom)) = lower(trim(v_patron_name))
     LIMIT 1;

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
