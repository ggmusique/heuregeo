import type { UserFeatures } from "../../types/profile";
import { getContractVisibility } from "./contractVisibility";
import type { ContractContextInput, ContractFeatures, ContractMode, ContractType, SurplusRule } from "./contract.types";

const DEFAULT_WEEKLY_QUOTA_HOURS = 20;
const DEFAULT_PAYABLE_RULE = "capped_quota" as const;
const DEFAULT_OVERFLOW_RULE = "ignore" as const;
const DEFAULT_SURPLUS_SPLIT_PCT = 50;
const DEFAULT_CONTRACT_TYPE: ContractType = "other";

function clampPct(value: number): number {
  return Math.min(100, Math.max(0, value));
}

function resolveWeeklyQuotaHours(features: UserFeatures): number {
  const raw = Number(features.contract_hours_week ?? features.contract_weekly_quota_hours);
  if (!Number.isFinite(raw) || raw <= 0) return DEFAULT_WEEKLY_QUOTA_HOURS;
  return raw;
}

function resolveContractType(features: UserFeatures): ContractType {
  const value = features.contract_type;
  if (value === "interim" || value === "formation" || value === "cdd" || value === "cdi" || value === "other") {
    return value;
  }
  return DEFAULT_CONTRACT_TYPE;
}

function resolveSurplusRule(features: UserFeatures): SurplusRule {
  if (features.surplus_rule === "payable" || features.surplus_rule === "banque" || features.surplus_rule === "les_deux") {
    return features.surplus_rule;
  }

  // Fallback legacy: mappe les anciennes clés vers le nouveau modèle.
  if (features.contract_overflow_rule === "to_reserve") return "banque";
  return "payable";
}

function resolveSurplusSplitPct(features: UserFeatures): number {
  const raw = Number(features.surplus_split_pct ?? DEFAULT_SURPLUS_SPLIT_PCT);
  if (!Number.isFinite(raw)) return DEFAULT_SURPLUS_SPLIT_PCT;
  return clampPct(raw);
}

export function deriveContractMode(features: UserFeatures): ContractMode {
  if (features?.plan !== "pro") return "free";
  const active = features?.contract_active ?? features?.contract_enabled ?? false;
  if (!active) return "free";
  return "pro";
}

export function buildContractFeatures({ features, isViewer }: ContractContextInput): ContractFeatures {
  const mode = deriveContractMode(features);
  const isPro = mode === "pro";
  const contractType = resolveContractType(features);
  const hoursPerWeek = resolveWeeklyQuotaHours(features);
  const surplusRule = resolveSurplusRule(features);
  const surplusSplitPct = resolveSurplusSplitPct(features);

  // Compatibilité avec les parties legacy de l'app.
  const payableRule = surplusRule === "payable" ? "worked_hours" : DEFAULT_PAYABLE_RULE;
  const overflowRule = surplusRule === "banque" || surplusRule === "les_deux" ? "to_reserve" : DEFAULT_OVERFLOW_RULE;
  const reserveEnabled = features.contract_reserve_enabled !== false;

  return {
    source: { mode, isPro },
    isViewer,
    contractType,
    hoursPerWeek,
    surplusRule,
    surplusSplitPct,
    weeklyQuotaHours: hoursPerWeek,
    reserveEnabled,
    payableRule,
    overflowRule,
    visibility: getContractVisibility(mode, isViewer),
  };
}
