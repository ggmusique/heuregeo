-- Fix complet du système d'invite_code :
-- 1. Backfill invite_code pour tous les profils owner/patron sans code
-- 2. Mettre à jour le trigger pour couvrir owner ET patron (pas seulement owner_id IS NULL)
-- 3. Mettre à jour le RPC pour chercher dans tous les profils avec un code

-- ─── 1. Backfill ──────────────────────────────────────────────────────────────
-- Profils owner/patron réels qui n'ont pas encore de code
UPDATE profiles
SET invite_code = upper(substring(replace(gen_random_uuid()::text, '-', ''), 1, 8))
WHERE role IN ('owner', 'patron')
  AND (invite_code IS NULL OR invite_code = '');

-- ─── 2. Trigger étendu ────────────────────────────────────────────────────────
-- Génère un code pour tout INSERT dont le rôle est 'owner' ou 'patron'
CREATE OR REPLACE FUNCTION public.generate_invite_code_trigger()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
AS $$
DECLARE
  new_code varchar(8);
BEGIN
  -- Générer un code seulement pour les vrais utilisateurs (owner ou patron)
  IF NEW.role NOT IN ('owner', 'patron') THEN
    RETURN NEW;
  END IF;
  -- Ne pas écraser un code déjà fourni
  IF NEW.invite_code IS NOT NULL AND NEW.invite_code <> '' THEN
    RETURN NEW;
  END IF;
  -- Générer un code unique
  LOOP
    new_code := upper(substring(replace(gen_random_uuid()::text, '-', ''), 1, 8));
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.profiles WHERE invite_code = new_code);
  END LOOP;
  NEW.invite_code := new_code;
  RETURN NEW;
END;
$$;

-- ─── 3. RPC sans restriction owner_id ─────────────────────────────────────────
-- On cherche par invite_code sans filtrer owner_id car :
-- - seuls les vrais users (owner/patron) ont des codes (via trigger + backfill)
-- - les sous-profils (viewer) n'ont pas de code
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
    LIMIT 1;
END;
$$;

REVOKE ALL ON FUNCTION public.search_by_invite_code(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.search_by_invite_code(text) TO authenticated;
