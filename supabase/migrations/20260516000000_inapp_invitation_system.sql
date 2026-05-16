-- ============================================================
-- Migration: Système d'invitation in-app
-- 2026-05-16
-- ============================================================

-- ─── 1. Ajouter invite_code et profile_complete à profiles ───────────────────

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS invite_code   varchar(8),
  ADD COLUMN IF NOT EXISTS profile_complete boolean NOT NULL DEFAULT false;

-- Générer un invite_code unique pour chaque ligne "profil principal"
-- (owner_id IS NULL = profil principal, pas une liaison patron/viewer)
DO $$
DECLARE
  rec RECORD;
  new_code varchar(8);
  ok boolean;
BEGIN
  FOR rec IN
    SELECT id FROM public.profiles WHERE invite_code IS NULL AND owner_id IS NULL
  LOOP
    ok := false;
    WHILE NOT ok LOOP
      new_code := upper(substring(replace(gen_random_uuid()::text, '-', ''), 1, 8));
      IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE invite_code = new_code) THEN
        ok := true;
      END IF;
    END LOOP;
    UPDATE public.profiles SET invite_code = new_code WHERE id = rec.id;
  END LOOP;
END;
$$;

-- Contrainte d'unicité sur invite_code (NULL exclus = lignes patron/viewer)
CREATE UNIQUE INDEX IF NOT EXISTS profiles_invite_code_unique
  ON public.profiles(invite_code)
  WHERE invite_code IS NOT NULL;

-- Marquer comme "complet" les profils existants ayant déjà prenom + nom
UPDATE public.profiles
SET profile_complete = true
WHERE owner_id IS NULL
  AND prenom IS NOT NULL AND prenom <> ''
  AND nom    IS NOT NULL AND nom    <> '';

-- ─── 2. Trigger: génère invite_code à chaque nouvel utilisateur ──────────────

CREATE OR REPLACE FUNCTION public.generate_invite_code_trigger()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  new_code varchar(8);
  ok boolean;
BEGIN
  -- Seulement pour les profils principaux (pas les liaisons patron/viewer)
  IF NEW.owner_id IS NOT NULL THEN
    RETURN NEW;
  END IF;
  IF NEW.invite_code IS NOT NULL AND NEW.invite_code <> '' THEN
    RETURN NEW;
  END IF;
  ok := false;
  WHILE NOT ok LOOP
    new_code := upper(substring(replace(gen_random_uuid()::text, '-', ''), 1, 8));
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE invite_code = new_code) THEN
      ok := true;
    END IF;
  END LOOP;
  NEW.invite_code := new_code;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_generate_invite_code ON public.profiles;
CREATE TRIGGER trg_generate_invite_code
  BEFORE INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.generate_invite_code_trigger();

-- ─── 3. Étendre patron_invitations ───────────────────────────────────────────

ALTER TABLE public.patron_invitations
  ADD COLUMN IF NOT EXISTS initiated_by  text NOT NULL DEFAULT 'owner'
    CONSTRAINT patron_inv_initiated_by_check CHECK (initiated_by IN ('owner', 'patron')),
  ADD COLUMN IF NOT EXISTS method        text NOT NULL DEFAULT 'email'
    CONSTRAINT patron_inv_method_check    CHECK (method IN ('email', 'in_app')),
  ADD COLUMN IF NOT EXISTS patron_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- ─── 4. Ajouter linked_user_id à patrons ─────────────────────────────────────
-- Permet de retrouver une entrée patrons créée via une invitation in-app

ALTER TABLE public.patrons
  ADD COLUMN IF NOT EXISTS linked_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS patrons_linked_user_id_owner_unique
  ON public.patrons(user_id, linked_user_id)
  WHERE linked_user_id IS NOT NULL;

-- ─── 5. RLS: le patron peut voir les invitations in-app qui le ciblent ───────

DROP POLICY IF EXISTS "patron_see_inapp_invitations" ON public.patron_invitations;
CREATE POLICY "patron_see_inapp_invitations"
  ON public.patron_invitations
  FOR SELECT
  TO authenticated
  USING (patron_user_id = auth.uid());

-- ─── 6. RPC: search_by_invite_code ──────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.search_by_invite_code(p_code text)
RETURNS TABLE(found_user_id uuid, found_prenom text, found_nom text)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
    SELECT p.id, p.prenom, p.nom
    FROM public.profiles p
    WHERE upper(p.invite_code) = upper(trim(p_code))
      AND p.id <> auth.uid()
      AND p.owner_id IS NULL       -- seulement les profils principaux
    LIMIT 1;
END;
$$;

REVOKE ALL ON FUNCTION public.search_by_invite_code(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.search_by_invite_code(text) TO authenticated;

-- ─── 7. RPC: create_inapp_invitation ─────────────────────────────────────────

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

  -- Trouver l'utilisateur cible par son invite_code
  SELECT p.id, p.prenom, p.nom
    INTO v_target_id, v_target_prenom, v_target_nom
    FROM public.profiles p
   WHERE upper(p.invite_code) = upper(trim(p_target_invite_code))
     AND p.owner_id IS NULL
   LIMIT 1;

  IF v_target_id IS NULL THEN
    RAISE EXCEPTION 'Code invalide : aucun utilisateur trouvé';
  END IF;

  IF v_target_id = v_caller_id THEN
    RAISE EXCEPTION 'Vous ne pouvez pas vous inviter vous-même';
  END IF;

  -- Récupérer le nom de l'appelant
  SELECT prenom, nom INTO v_caller_prenom, v_caller_nom
    FROM public.profiles WHERE id = v_caller_id AND owner_id IS NULL;

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

-- ─── 8. RPC: accept_inapp_invitation ─────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.accept_inapp_invitation(p_invitation_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inv     patron_invitations%ROWTYPE;
  v_features jsonb;
BEGIN
  SELECT * INTO v_inv FROM public.patron_invitations WHERE id = p_invitation_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invitation introuvable';
  END IF;

  IF v_inv.status <> 'pending' THEN
    RAISE EXCEPTION 'Invitation déjà traitée (statut : %)', v_inv.status;
  END IF;

  -- Autorisation : uniquement le patron cible ou l'ouvrier émetteur
  IF auth.uid() <> v_inv.patron_user_id AND auth.uid() <> v_inv.owner_id THEN
    RAISE EXCEPTION 'Non autorisé';
  END IF;

  v_features := jsonb_build_object(
    'access_agenda',    v_inv.access_agenda,
    'access_dashboard', v_inv.access_dashboard
  );

  -- Mettre à jour le profil principal du patron pour le lier à cet ouvrier
  UPDATE public.profiles
     SET owner_id  = v_inv.owner_id,
         patron_id = v_inv.patron_id,
         role      = COALESCE(v_inv.invite_role, 'patron'),
         status    = 'active',
         features  = COALESCE(features, '{}'::jsonb) || v_features,
         updated_at = now()
   WHERE id       = v_inv.patron_user_id
     AND owner_id IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profil du patron introuvable';
  END IF;

  -- Marquer l'invitation comme acceptée
  UPDATE public.patron_invitations
     SET status = 'accepted', updated_at = now()
   WHERE id = p_invitation_id;
END;
$$;

REVOKE ALL ON FUNCTION public.accept_inapp_invitation(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.accept_inapp_invitation(uuid) TO authenticated;

-- ─── 9. RPC: refuse_inapp_invitation ─────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.refuse_inapp_invitation(p_invitation_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.patron_invitations
     SET status = 'refused', updated_at = now()
   WHERE id     = p_invitation_id
     AND (patron_user_id = auth.uid() OR owner_id = auth.uid())
     AND status = 'pending';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invitation introuvable ou non autorisée';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.refuse_inapp_invitation(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.refuse_inapp_invitation(uuid) TO authenticated;

-- ─── 10. RLS pour invite_code (lecture seule via search_by_invite_code) ──────
-- La lecture directe de la colonne invite_code est protégée par RLS existant
-- L'accès public se fait UNIQUEMENT via la fonction SECURITY DEFINER ci-dessus

-- ─── 11. RLS: mise à jour de profile_complete ────────────────────────────────
-- L'utilisateur peut mettre à jour son propre profile_complete
-- (couvert par la policy existante "own_profile_update" ou équivalente)

-- Vérifier qu'il existe bien une policy permettant l'UPDATE sur profiles par l'utilisateur
-- (profiles_update_own ou similaire — déjà en place depuis les migrations précédentes)
