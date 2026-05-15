-- ============================================================
-- MIGRATION: Fix frais_divers user_id NULL
-- Date: 2026-05-20
--
-- Problème : user_id était NULL sur tous les frais existants
-- (pas de valeur par défaut sur la colonne), rendant les frais
-- invisibles via la policy frais_divers_select_own (auth.uid() = user_id).
--
-- Corrections :
--   1. Patcher les lignes existantes avec user_id = owner depuis patrons
--   2. Ajouter DEFAULT auth.uid() pour que les futurs inserts fonctionnent
--      même sans passer user_id explicitement
-- ============================================================

-- 1. Patcher les frais sans user_id dont on peut inférer le propriétaire via patrons
UPDATE public.frais_divers f
SET user_id = p.user_id
FROM public.patrons p
WHERE f.patron_id = p.id
  AND f.user_id IS NULL;

-- 2. Ajouter DEFAULT auth.uid() pour sécuriser les futurs inserts
ALTER TABLE public.frais_divers
  ALTER COLUMN user_id SET DEFAULT auth.uid();
