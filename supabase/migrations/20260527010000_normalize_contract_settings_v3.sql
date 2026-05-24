-- Migration: normalisation des paramètres contrat (modèle métier simplifié)
-- Table cible: public.profiles, colonne JSONB features
-- Aucun DROP/CREATE destructif: migration additive + mapping legacy.

WITH normalized AS (
  SELECT
    p.id,
    CASE
      WHEN COALESCE(p.features, '{}'::jsonb)->>'contract_type' IN ('interim', 'formation', 'cdd', 'cdi', 'other')
        THEN COALESCE(p.features, '{}'::jsonb)->>'contract_type'
      ELSE 'other'
    END AS contract_type,
    CASE
      WHEN (COALESCE(p.features, '{}'::jsonb)->>'contract_hours_week') ~ '^[0-9]+(\.[0-9]+)?$'
        THEN ROUND((COALESCE(p.features, '{}'::jsonb)->>'contract_hours_week')::numeric, 2)::numeric(5,2)
      WHEN (COALESCE(p.features, '{}'::jsonb)->>'contract_weekly_quota_hours') ~ '^[0-9]+(\.[0-9]+)?$'
        THEN ROUND((COALESCE(p.features, '{}'::jsonb)->>'contract_weekly_quota_hours')::numeric, 2)::numeric(5,2)
      ELSE 20.00::numeric(5,2)
    END AS contract_hours_week,
    CASE
      WHEN COALESCE(p.features, '{}'::jsonb)->>'surplus_rule' IN ('payable', 'banque', 'les_deux')
        THEN COALESCE(p.features, '{}'::jsonb)->>'surplus_rule'
      WHEN COALESCE(p.features, '{}'::jsonb)->>'contract_overflow_rule' = 'to_reserve'
        THEN 'banque'
      ELSE 'payable'
    END AS surplus_rule,
    CASE
      WHEN (COALESCE(p.features, '{}'::jsonb)->>'surplus_split_pct') ~ '^[0-9]+(\.[0-9]+)?$'
        THEN LEAST(100.00, GREATEST(0.00, ROUND((COALESCE(p.features, '{}'::jsonb)->>'surplus_split_pct')::numeric, 2)))::numeric(5,2)
      ELSE 50.00::numeric(5,2)
    END AS surplus_split_pct
  FROM public.profiles p
)
UPDATE public.profiles p
SET features = COALESCE(p.features, '{}'::jsonb)
  || jsonb_build_object(
    'contract_type', n.contract_type,
    'contract_hours_week', n.contract_hours_week,
    'surplus_rule', n.surplus_rule,
    'surplus_split_pct', n.surplus_split_pct,

    -- Sync legacy keys (compat code existant)
    'contract_weekly_quota_hours', n.contract_hours_week,
    'contract_payable_rule', CASE WHEN n.surplus_rule = 'payable' THEN 'worked_hours' ELSE 'capped_quota' END,
    'contract_overflow_rule', CASE WHEN n.surplus_rule IN ('banque', 'les_deux') THEN 'to_reserve' ELSE 'ignore' END
  )
FROM normalized n
WHERE p.id = n.id;
