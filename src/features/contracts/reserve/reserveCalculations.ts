import type { ReserveMovementRow, ReserveSyncWeeklyInput } from "./reserve.types";

function sanitizeHours(value: number | string | undefined | null): number {
  const num = Number(value ?? 0);
  if (!Number.isFinite(num)) return 0;
  return Math.round(num * 100) / 100;
}

export function computeReserveBalanceHours(movements: ReserveMovementRow[]): number {
  return Math.round(
    movements.reduce((sum, movement) => sum + sanitizeHours(movement.delta_hours), 0) * 100,
  ) / 100;
}

export function computeWeeklySettlementDelta(input: ReserveSyncWeeklyInput): number {
  if (!input.reserveEnabled) return 0;

  const workedHours = Math.max(0, sanitizeHours(input.workedHours));
  const quotaHours = Math.max(0, sanitizeHours(input.quotaHours));

  const missingToQuota = Math.max(0, quotaHours - workedHours);
  const overflowHours = Math.max(0, workedHours - quotaHours);

  if (input.overflowRule === "to_reserve") {
    return sanitizeHours(missingToQuota + overflowHours);
  }

  return sanitizeHours(missingToQuota);
}

export function buildWeeklySettlementKey(patronId: string | null, weekValue: string): string {
  return `weekly_settlement:${patronId || "global"}:${weekValue}`;
}
