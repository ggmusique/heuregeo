import type {
  ContractCalculationInput,
  ContractCalculationResult,
  ContractFeatures,
  SurplusRule,
  WeeklySettlementInput,
  WeeklySettlementResult,
  WeeklySettlementStatus,
} from "./contract.types";

function sanitizeHours(value: number | undefined): number {
  const num = Number(value ?? 0);
  if (!Number.isFinite(num)) return 0;
  return Math.max(0, num);
}

function sanitizeAmount(value: number | undefined): number {
  const num = Number(value ?? 0);
  if (!Number.isFinite(num)) return 0;
  return Math.max(0, Math.round(num * 100) / 100);
}

function clampPct(value: number | undefined): number {
  const num = Number(value ?? 50);
  if (!Number.isFinite(num)) return 50;
  return Math.min(100, Math.max(0, num));
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function isPastWeek(weekStartIso: string, now: Date): boolean {
  const weekStart = new Date(`${weekStartIso}T00:00:00`);
  if (Number.isNaN(weekStart.getTime())) return false;
  return weekStart.getTime() < now.getTime();
}

function isOlderThan14Days(weekStartIso: string, now: Date): boolean {
  const weekStart = new Date(`${weekStartIso}T00:00:00`);
  if (Number.isNaN(weekStart.getTime())) return false;
  const ageMs = now.getTime() - weekStart.getTime();
  return ageMs > 14 * 24 * 60 * 60 * 1000;
}

function splitSurplusHours(
  surplusHours: number,
  rule: SurplusRule,
  splitPct: number,
): { payable: number; banque: number } {
  if (surplusHours <= 0) return { payable: 0, banque: 0 };

  if (rule === "payable") return { payable: surplusHours, banque: 0 };
  if (rule === "banque") return { payable: 0, banque: surplusHours };

  const payable = round2(surplusHours * (splitPct / 100));
  const banque = round2(surplusHours - payable);
  return { payable, banque };
}

function resolveWeeklyStatus(input: WeeklySettlementInput, now: Date): WeeklySettlementStatus {
  if (!input.isEncoded && isPastWeek(input.weekStartIso, now)) {
    return "non_encodee";
  }

  if (input.isEncoded && !input.isPaid && isOlderThan14Days(input.weekStartIso, now)) {
    return "reportee";
  }

  return "soldee";
}

export function calculateWeeklySettlement(input: WeeklySettlementInput): WeeklySettlementResult {
  const workedHours = sanitizeHours(input.workedHours);
  const contractHoursWeek = sanitizeHours(input.contractHoursWeek);
  const surplusHours = Math.max(0, workedHours - contractHoursWeek);
  const splitPct = clampPct(input.surplusSplitPct);
  const now = input.nowIso ? new Date(input.nowIso) : new Date();

  const { payable: surplusPayableHours, banque: surplusBanqueHours } = splitSurplusHours(
    surplusHours,
    input.surplusRule,
    splitPct,
  );

  const hourlyRate = sanitizeAmount(input.hourlyRate);
  const grossPayableAmount = round2(surplusPayableHours * hourlyRate);

  const acompteAmount = sanitizeAmount(input.acompteAmount);
  const acompteCarryForwardIn = sanitizeAmount(input.acompteCarryForward);
  const totalAcompteToApply = round2(acompteAmount + acompteCarryForwardIn);
  const acompteApplied = Math.min(totalAcompteToApply, grossPayableAmount);
  const carryForward = round2(Math.max(0, totalAcompteToApply - grossPayableAmount));
  const netBeforeFrais = round2(Math.max(0, grossPayableAmount - acompteApplied));

  const fraisRemboursables = sanitizeAmount(input.fraisRemboursables);
  const fraisDeductibles = sanitizeAmount(input.fraisDeductibles);
  const netAfterFrais = round2(Math.max(0, netBeforeFrais + fraisRemboursables - fraisDeductibles));

  const status = resolveWeeklyStatus(input, now);
  const badgeLabel = status === "non_encodee" ? "À encoder" : status === "reportee" ? "En retard" : "Soldée";

  return {
    workedHours,
    contractHoursWeek,
    surplusHours,
    surplusPayableHours,
    surplusBanqueHours,
    grossPayableAmount,
    acompteApplied: round2(acompteApplied),
    acompteCarryForward: carryForward,
    netBeforeFrais,
    netAfterFrais,
    status,
    badgeLabel,
  };
}

export function calculateContractReserve(input: ContractCalculationInput, contract: ContractFeatures): number {
  if (!contract.source.isPro || !contract.reserveEnabled) return 0;
  const quotaHours = sanitizeHours(input.quotaHours ?? contract.hoursPerWeek);
  const workedHours = sanitizeHours(input.workedHours);
  const surplus = Math.max(0, workedHours - quotaHours);
  const split = splitSurplusHours(surplus, contract.surplusRule, contract.surplusSplitPct);
  return split.banque;
}

export function calculatePayableHours(input: ContractCalculationInput, contract: ContractFeatures): number {
  const workedHours = sanitizeHours(input.workedHours);
  if (!contract.source.isPro) return workedHours;

  const quotaHours = sanitizeHours(input.quotaHours ?? contract.hoursPerWeek);
  const surplus = Math.max(0, workedHours - quotaHours);
  const split = splitSurplusHours(surplus, contract.surplusRule, contract.surplusSplitPct);
  return round2(quotaHours + split.payable);
}

export function calculateQuotaOverflow(input: ContractCalculationInput, contract: ContractFeatures): number {
  if (!contract.source.isPro) return 0;
  const quotaHours = sanitizeHours(input.quotaHours ?? contract.hoursPerWeek);
  const workedHours = sanitizeHours(input.workedHours);
  return Math.max(0, workedHours - quotaHours);
}

export function calculateWeeklyBilan(input: ContractCalculationInput, contract: ContractFeatures): ContractCalculationResult {
  const workedHours = sanitizeHours(input.workedHours);
  const quotaHours = sanitizeHours(input.quotaHours ?? contract.hoursPerWeek);

  if (!contract.source.isPro) {
    return {
      workedHours,
      quotaHours,
      payableHours: workedHours,
      reserveHours: 0,
      overtimeHours: 0,
      quotaOverflowHours: 0,
    };
  }

  const quotaOverflowHours = calculateQuotaOverflow(input, contract);
  const split = splitSurplusHours(quotaOverflowHours, contract.surplusRule, contract.surplusSplitPct);
  const reserveHours = contract.reserveEnabled ? split.banque : 0;
  const payableHours = round2(quotaHours + split.payable);

  return {
    workedHours,
    quotaHours,
    payableHours,
    reserveHours,
    overtimeHours: quotaOverflowHours,
    quotaOverflowHours,
  };
}
