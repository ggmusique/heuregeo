-- ============================================================
-- Migration : RPC vérification d'existence d'un compte email
-- Date      : 2026-05-13
-- Objectif  : Permettre à la page d'acceptation d'invitation
--             de savoir si l'email de l'invitation correspond
--             à un compte Supabase Auth existant, sans exposer
--             les données utilisateurs.
-- ============================================================

CREATE OR REPLACE FUNCTION public.patron_email_has_account(p_email text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM auth.users
    WHERE email = lower(trim(p_email))
  );
$$;

-- Accessible aux utilisateurs anonymes (page d'invitation sans session)
GRANT EXECUTE ON FUNCTION public.patron_email_has_account(text) TO anon, authenticated;
