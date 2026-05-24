import type { ReserveMovementInput, ReserveMovementRow } from "./reserve.types";

export function toReserveRowSnapshot(input: ReserveMovementInput): Pick<ReserveMovementRow, "movement_type" | "movement_source" | "delta_hours" | "movement_date" | "period_type" | "period_value" | "comment"> {
  return {
    movement_type: input.movementType,
    movement_source: input.source,
    delta_hours: input.deltaHours,
    movement_date: input.movementDate || new Date().toISOString(),
    period_type: input.periodType ?? null,
    period_value: input.periodValue ?? null,
    comment: input.comment ?? null,
  };
}
