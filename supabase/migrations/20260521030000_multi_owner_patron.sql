-- =============================================================================
-- Migration 20260521030000 : support multi-ouvrier pour les patrons
-- =============================================================================
-- Problème racine : accept_inapp_invitation écrasait profiles.owner_id et
-- profiles.patron_id à chaque invitation acceptée, effaçant le lien précédent.
--
-- Solution :
--  1. accept_inapp_invitation : ne touche owner_id / patron_id QUE si null
--     (premier lien). Les liens suivants sont enregistrés dans patron_invitations
--     (status='accepted') et accessibles via switch_patron_context.
--  2. switch_patron_context(invitation_id) : met à jour profiles pour pointer
--     sur l'ouvrier sélectionné → le RLS (qui lit profiles.owner_id et
--     profiles.patron_id) fonctionnera correctement.
-- =============================================================================

-- ─── 1. accept_inapp_invitation : ne pas écraser le lien existant ─────────────
CREATE OR REPLACE FUNCTION public.accept_inapp_invitation(
  p_invitation_id uuid
) RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
AS $$
DECLARE
  v_caller_id uuid := auth.uid();
  v_inv       patron_invitations%ROWTYPE;
  v_features  jsonb;
  v_has_link  boolean;
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

  -- Seul le destinataire peut accepter :
  --   initiated_by='patron' → destinataire = owner (ouvrier)
  --   initiated_by='owner'  → destinataire = patron
  IF v_inv.initiated_by = 'patron' AND v_caller_id <> v_inv.owner_id THEN
    RAISE EXCEPTION 'Non autorisé';
  END IF;
  IF v_inv.initiated_by = 'owner' AND v_caller_id <> v_inv.patron_user_id THEN
    RAISE EXCEPTION 'Non autorisé';
  END IF;

  v_features := jsonb_build_object(
    'access_agenda',    v_inv.access_agenda,
    'access_dashboard', v_inv.access_dashboard
  );

  -- Vérifier si le profil patron a déjà un lien actif
  SELECT (owner_id IS NOT NULL AND patron_id IS NOT NULL)
    INTO v_has_link
    FROM public.profiles
   WHERE id = v_inv.patron_user_id;

  -- Mettre à jour le profil du patron :
  --   - status et features toujours mis à jour
  --   - owner_id / patron_id seulement si pas encore de lien (premier accès)
  --     → les accès suivants se gèrent via switch_patron_context
  UPDATE public.profiles
     SET owner_id   = CASE WHEN NOT v_has_link THEN v_inv.owner_id  ELSE owner_id  END,
         patron_id  = CASE WHEN NOT v_has_link THEN v_inv.patron_id ELSE patron_id END,
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

-- ─── 2. switch_patron_context : changer l'ouvrier actif pour un patron ────────
-- Quand un patron a plusieurs ouvriers, il choisit lequel afficher.
-- Cette fonction met à jour profiles.owner_id / patron_id vers l'invitation
-- sélectionnée → le RLS des tables (missions, acomptes, frais…) se base sur
-- ces deux colonnes pour filtrer les données.
CREATE OR REPLACE FUNCTION public.switch_patron_context(
  p_invitation_id uuid
) RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
AS $$
DECLARE
  v_caller_id uuid := auth.uid();
  v_inv       patron_invitations%ROWTYPE;
BEGIN
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Utilisateur non authentifié';
  END IF;

  SELECT * INTO v_inv
    FROM public.patron_invitations
   WHERE id = p_invitation_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invitation introuvable';
  END IF;

  -- Seul le patron destinataire peut switcher
  IF v_inv.patron_user_id <> v_caller_id THEN
    RAISE EXCEPTION 'Non autorisé';
  END IF;

  IF v_inv.status <> 'accepted' THEN
    RAISE EXCEPTION 'Invitation non acceptée (statut : %)', v_inv.status;
  END IF;

  UPDATE public.profiles
     SET owner_id   = v_inv.owner_id,
         patron_id  = v_inv.patron_id,
         features   = COALESCE(features, '{}'::jsonb) || jsonb_build_object(
                        'access_agenda',    v_inv.access_agenda,
                        'access_dashboard', v_inv.access_dashboard
                      ),
         updated_at = now()
   WHERE id = v_caller_id;
END;
$$;
