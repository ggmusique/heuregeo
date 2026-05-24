-- Migration: restreindre l'UPDATE direct sur profiles pour les admins.
-- L'admin ne peut plus modifier les features des autres utilisateurs via l'API
-- standard. Pour changer le plan d'un utilisateur, l'admin utilise désormais
-- la fonction SECURITY DEFINER `admin_set_user_plan`.
--
-- Impact:
--   - La policy "Utilisateur modifie son propre profil" (UPDATE, is_admin OR own)
--     est supprimée. La policy ALL "Utilisateur gère son propre profil"
--     (auth.uid() = id) reste et couvre l'UPDATE pour le propriétaire.
--   - Un admin ne peut plus mettre à jour directement le profil d'un autre user.
--   - La fonction admin_set_user_plan() permet à un admin de changer les
--     features complètes d'un user (plan toggle) de manière contrôlée.

-- ─── 1. Supprimer la policy UPDATE trop permissive ───────────────────────────

DROP POLICY IF EXISTS "Utilisateur modifie son propre profil" ON public.profiles;

-- ─── 2. Fonction SECURITY DEFINER pour le changement de plan par l'admin ─────

CREATE OR REPLACE FUNCTION public.admin_set_user_plan(
  p_target_user_id uuid,
  p_new_features    jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Seul un admin authentifié peut appeler cette fonction.
  IF NOT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid() AND is_admin = true
  ) THEN
    RAISE EXCEPTION 'permission denied: réservé aux administrateurs';
  END IF;

  UPDATE public.profiles
  SET features = p_new_features
  WHERE id = p_target_user_id;
END;
$$;

-- ─── 3. Contrôle d'accès à la fonction ───────────────────────────────────────

REVOKE EXECUTE ON FUNCTION public.admin_set_user_plan(uuid, jsonb) FROM anon, public;
GRANT  EXECUTE ON FUNCTION public.admin_set_user_plan(uuid, jsonb) TO authenticated;
