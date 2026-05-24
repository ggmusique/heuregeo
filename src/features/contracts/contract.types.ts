import type { UserFeatures } from "../../types/profile";

export type ContractMode = "free" | "pro";

export interface ContractSource {
  mode: ContractMode;
  isPro: boolean;
}

export interface ContractVisibility {
  suivi: {
    showReserveTab: boolean;
  };
  bilan: {
    showOvertimeKpi: boolean;
    showPayableHoursKpi: boolean;
    showReserveKpi: boolean;
  };
}

export interface ContractFeatures {
  source: ContractSource;
  isViewer: boolean;
  weeklyQuotaHours: number;
  reserveEnabled: boolean;
  payableRule: "capped_quota" | "worked_hours";
  overflowRule: "ignore" | "to_reserve";
  visibility: ContractVisibility;
}

export interface ContractCalculationInput {
  workedHours: number;
  quotaHours?: number;
}

export interface ContractCalculationResult {
  workedHours: number;
  quotaHours: number;
  payableHours: number;
  reserveHours: number;
  overtimeHours: number;
  quotaOverflowHours: number;
}

export interface ContractContextInput {
  features: UserFeatures;
  isViewer: boolean;
}
