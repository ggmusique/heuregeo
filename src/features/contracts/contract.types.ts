import type { UserFeatures } from "../../types/profile";

export type ContractMode = "free" | "pro";
export type ContractType = "interim" | "formation" | "cdd" | "cdi" | "other";
export type SurplusRule = "payable" | "banque" | "les_deux";

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
  contractType: ContractType;
  hoursPerWeek: number;
  surplusRule: SurplusRule;
  surplusSplitPct: number;

  // Compat legacy: conservé tant que certaines vues utilisent encore ces noms.
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

export type WeeklySettlementStatus = "soldee" | "non_encodee" | "reportee";

export interface WeeklySettlementInput {
  workedHours: number;
  contractHoursWeek: number;
  surplusRule: SurplusRule;
  surplusSplitPct?: number;
  hourlyRate?: number;
  acompteAmount?: number;
  acompteCarryForward?: number;
  fraisRemboursables?: number;
  fraisDeductibles?: number;
  weekStartIso: string;
  nowIso?: string;
  isEncoded: boolean;
  isPaid?: boolean;
}

export interface WeeklySettlementResult {
  workedHours: number;
  contractHoursWeek: number;
  surplusHours: number;
  surplusPayableHours: number;
  surplusBanqueHours: number;
  grossPayableAmount: number;
  acompteApplied: number;
  acompteCarryForward: number;
  netBeforeFrais: number;
  netAfterFrais: number;
  status: WeeklySettlementStatus;
  badgeLabel: "À encoder" | "En retard" | "Soldée";
}

export interface ContractContextInput {
  features: UserFeatures;
  isViewer: boolean;
}
