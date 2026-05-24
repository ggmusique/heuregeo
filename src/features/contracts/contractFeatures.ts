import type { UserFeatures } from "../../types/profile";
import { getContractVisibility } from "./contractVisibility";
import type { ContractContextInput, ContractFeatures, ContractMode } from "./contract.types";

const DEFAULT_WEEKLY_QUOTA_HOURS = 8;
const DEFAULT_PAYABLE_RULE = "capped_quota" as const;
const DEFAULT_OVERFLOW_RULE = "ignore" as const;

function resolveWeeklyQuotaHours(features: UserFeatures): number {
  const raw = Number(features.contract_weekly_quota_hours);
  if (!Number.isFinite(raw) || raw <= 0) return DEFAULT_WEEKLY_QUOTA_HOURS;
  return raw;
}

export function deriveContractMode(features: UserFeatures): ContractMode {
  if (features?.plan !== "pro") return "free";
  if (features?.contract_enabled === false) return "free";
  return "pro";
}

export function buildContractFeatures({ features, isViewer }: ContractContextInput): ContractFeatures {
  const mode = deriveContractMode(features);
  const isPro = mode === "pro";
  const payableRule = features.contract_payable_rule === "worked_hours"
    ? "worked_hours"
    : DEFAULT_PAYABLE_RULE;
  const overflowRule = features.contract_overflow_rule === "to_reserve"
    ? "to_reserve"
    : DEFAULT_OVERFLOW_RULE;
  const reserveEnabled = features.contract_reserve_enabled !== false;

  return {
    source: { mode, isPro },
    isViewer,
    weeklyQuotaHours: resolveWeeklyQuotaHours(features),
    reserveEnabled,
    payableRule,
    overflowRule,
    visibility: getContractVisibility(mode, isViewer),
  };
}
