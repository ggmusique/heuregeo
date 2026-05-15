-- ============================================================
-- Migration : Normaliser les features des profils viewer
-- Date      : 2026-05-15
-- Raison    : Les viewers activés avant la migration invite_role
--             ont des features de type ouvrier (plan, bilan_mois…)
--             au lieu de {access_agenda, access_dashboard}.
--             On normalise en préservant les clés access_* existantes.
-- ============================================================

UPDATE public.profiles
SET features = jsonb_build_object(
  'access_agenda',    COALESCE((features->>'access_agenda')::boolean, false),
  'access_dashboard', COALESCE((features->>'access_dashboard')::boolean, false)
)
WHERE role IN ('viewer', 'patron')
  AND (
    features ? 'plan'
    OR features ? 'bilan_mois'
    OR features ? 'export_pdf'
    OR NOT (features ? 'access_agenda' OR features ? 'access_dashboard')
  );
