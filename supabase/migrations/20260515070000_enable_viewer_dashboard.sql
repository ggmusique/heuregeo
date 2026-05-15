-- Activer access_dashboard pour le viewer existant
-- (features normalisées mais dashboard encore à false)
UPDATE public.profiles
SET features = jsonb_build_object(
  'access_agenda',    COALESCE((features->>'access_agenda')::boolean, false),
  'access_dashboard', true
)
WHERE role = 'viewer'
  AND status = 'active';
