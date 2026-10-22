-- =============================================================================
-- Migration : Fix acomptes user_id DEFAULT auth.uid()
-- Date      : 2026-06-15
-- Auteur    : Audit sécurité - correction symétrique à frais_divers
-- =============================================================================
-- PROBLÈME :
--   La table acomptes n'a pas de DEFAULT sur user_id.
--   L'API createAcompte ne passe pas user_id explicitement.
--   Résultat : user_id = NULL à l'insert → apply_acompte échoue
--   (ownership check: AND user_id = auth.uid() ne matche pas).
--
-- CORRECTIF (identique à 20260520010000_fix_frais_divers_user_id.sql) :
--   1. Patcher les acomptes existants sans user_id via patron_id → patrons.user_id
--   2. Ajouter DEFAULT auth.uid() pour sécuriser les futurs inserts
-- =============================================================================

-- 1. Patcher les acomptes sans user_id dont on peut inférer le propriétaire via patrons
UPDATE public.acomptes a
SET user_id = p.user_id
FROM public.patrons p
WHERE a.patron_id = p.id
  AND a.user_id IS NULL
  AND p.user_id IS NOT NULL;

-- 2. Ajouter DEFAULT auth.uid() pour sécuriser les futurs inserts
-- (même si l'API oublie de passer user_id, la DB le mettra automatiquement)
ALTER TABLE public.acomptes
  ALTER COLUMN user_id SET DEFAULT auth.uid();

-- 3. Vérification : plus d'acomptes orphelins (user_id IS NULL) pour des patrons valides
DO $$
DECLARE
  v_count integer;
BEGIN
  SELECT count(*) INTO v_count
  FROM public.acomptes a
  WHERE a.user_id IS NULL
    AND a.patron_id IS NOT NULL
    AND EXISTS (SELECT 1 FROM public.patrons p WHERE p.id = a.patron_id AND p.user_id IS NOT NULL);
  
  IF v_count > 0 THEN
    RAISE WARNING 'ATTENTION: % acomptes ont encore user_id=NULL malgré un patron valide', v_count;
  ELSE
    RAISE NOTICE 'OK: Tous les acomptes avec patron valide ont maintenant un user_id';
  END IF;
END $$;