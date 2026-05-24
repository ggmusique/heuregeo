import type { UserFeatures } from "../../types/profile";

export interface ContractFormState {
  contractActive: boolean;
  contractType: "interim" | "formation" | "cdd" | "cdi" | "other";
  contractHoursWeek: number;
  surplusRule: "payable" | "banque" | "les_deux";
  surplusSplitPct: number;
}

export function resolveContractActive(features: UserFeatures): boolean {
  // Migration-safe default: if no explicit value exists, keep contract disabled.
  return Boolean(features.contract_active ?? features.contract_enabled ?? false);
}

export function buildContractFeaturesUpdate(
  features: UserFeatures,
  form: ContractFormState,
): UserFeatures {
  const nextSplit = Math.min(100, Math.max(0, Number(form.surplusSplitPct)));
  const nextHours = Number(form.contractHoursWeek);

  const safeHours = Number.isFinite(nextHours) && nextHours > 0 ? nextHours : 20;
  const safeSplit = Number.isFinite(nextSplit) ? nextSplit : 50;

  return {
    ...features,
    contract_active: form.contractActive,
    contract_enabled: form.contractActive,
    contract_type: form.contractType,
    contract_hours_week: safeHours,
    surplus_rule: form.surplusRule,
    surplus_split_pct: safeSplit,
    contract_reserve_enabled: form.contractActive,
    // Legacy sync
    contract_weekly_quota_hours: safeHours,
    contract_payable_rule: form.surplusRule === "payable" ? "worked_hours" : "capped_quota",
    contract_overflow_rule:
      form.surplusRule === "banque" || form.surplusRule === "les_deux" ? "to_reserve" : "ignore",
  };
}
