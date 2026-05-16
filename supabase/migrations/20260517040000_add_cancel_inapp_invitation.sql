-- RPC: cancel_inapp_invitation
-- Autorise l'annulation par l'ouvrier (owner_id) OU le patron (patron_user_id)
-- SECURITY DEFINER pour contourner la RLS qui bloque le patron sur UPDATE

CREATE OR REPLACE FUNCTION public.cancel_inapp_invitation(p_invitation_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.patron_invitations
    SET status     = 'cancelled',
        updated_at = now()
  WHERE id     = p_invitation_id
    AND status  = 'pending'
    AND (owner_id = auth.uid() OR patron_user_id = auth.uid());

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invitation introuvable ou déjà traitée';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.cancel_inapp_invitation(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cancel_inapp_invitation(uuid) TO authenticated;
