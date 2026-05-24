import type { ContractCalculationInput, ContractCalculationResult, ContractFeatures } from "./contract.types";

function sanitizeHours(value: number | undefined): number {
  const num = Number(value ?? 0);
  if (!Number.isFinite(num)) return 0;
  return Math.max(0, num);
}

export function calculateContractReserve(input: ContractCalculationInput, contract: ContractFeatures): number {
  if (!contract.source.isPro || !contract.reserveEnabled) return 0;
  const quotaHours = sanitizeHours(input.quotaHours ?? contract.weeklyQuotaHours);
  const workedHours = sanitizeHours(input.workedHours);
  return Math.max(0, quotaHours - workedHours);
}

export function calculatePayableHours(input: ContractCalculationInput, contract: ContractFeatures): number {
  const workedHours = sanitizeHours(input.workedHours);
  if (!contract.source.isPro) return workedHours;
  if (contract.payableRule === "worked_hours") return workedHours;
  const quotaHours = sanitizeHours(input.quotaHours ?? contract.weeklyQuotaHours);
  return Math.min(workedHours, quotaHours);
}

export function calculateQuotaOverflow(input: ContractCalculationInput, contract: ContractFeatures): number {
  if (!contract.source.isPro) return 0;
  const quotaHours = sanitizeHours(input.quotaHours ?? contract.weeklyQuotaHours);
  const workedHours = sanitizeHours(input.workedHours);
  return Math.max(0, workedHours - quotaHours);
}

export function calculateWeeklyBilan(input: ContractCalculationInput, contract: ContractFeatures): ContractCalculationResult {
  const workedHours = sanitizeHours(input.workedHours);
  const quotaHours = sanitizeHours(input.quotaHours ?? contract.weeklyQuotaHours);

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

  const reserveHours = calculateContractReserve(input, contract);
  const quotaOverflowHours = calculateQuotaOverflow(input, contract);
  const payableHours = calculatePayableHours(input, contract);
  const overflowToReserve = contract.reserveEnabled && contract.overflowRule === "to_reserve"
    ? quotaOverflowHours
    : 0;

  return {
    workedHours,
    quotaHours,
    payableHours,
    reserveHours: reserveHours + overflowToReserve,
    overtimeHours: quotaOverflowHours,
    quotaOverflowHours,
  };
}
