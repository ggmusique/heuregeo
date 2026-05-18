-- =============================================================================
-- Migration : Amélioration rate_limit_log — ajout colonne ip_address
-- Date      : 2026-05-26
-- =============================================================================
--
-- OBJECTIF :
--   Ajouter la colonne ip_address à rate_limit_log pour permettre
--   un rate limiting par IP en plus du rate limiting par user_id.
--   Cela protège contre un attaquant qui créerait plusieurs comptes.
-- =============================================================================

ALTER TABLE public.rate_limit_log
  ADD COLUMN IF NOT EXISTS ip_address inet;

COMMENT ON COLUMN public.rate_limit_log.ip_address IS
  'Adresse IP de l''appelant (extraite de X-Forwarded-For). Nullable.';

-- Index pour les queries par IP
CREATE INDEX IF NOT EXISTS idx_rate_limit_log_ip
  ON public.rate_limit_log (action, ip_address, created_at)
  WHERE ip_address IS NOT NULL;
