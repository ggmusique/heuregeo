-- Fix: search_by_invite_code échouait quand auth.uid() retourne NULL dans le
-- contexte SECURITY DEFINER → la comparaison uuid <> NULL = NULL (filtre tout).
-- Solution : retirer la condition du RPC et la gérer dans create_inapp_invitation.

CREATE OR REPLACE FUNCTION public.search_by_invite_code(p_code text)
  RETURNS TABLE(found_user_id uuid, found_prenom text, found_nom text)
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
    SELECT p.id, p.prenom::text, p.nom::text
    FROM public.profiles p
    WHERE upper(p.invite_code) = upper(trim(p_code))
      AND p.owner_id IS NULL   -- seulement les profils principaux
    LIMIT 1;
END;
$$;

REVOKE ALL ON FUNCTION public.search_by_invite_code(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.search_by_invite_code(text) TO authenticated;
