import type { ReserveHistoryFilters, ReserveMovementRow } from "./reserve.types";

export function sortReserveHistory(movements: ReserveMovementRow[]): ReserveMovementRow[] {
  return [...movements].sort((a, b) => {
    const dateDiff = new Date(b.movement_date).getTime() - new Date(a.movement_date).getTime();
    if (dateDiff !== 0) return dateDiff;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });
}

export function filterReserveHistory(
  movements: ReserveMovementRow[],
  filters: ReserveHistoryFilters,
): ReserveMovementRow[] {
  return movements.filter((movement) => {
    if (filters.movementType && movement.movement_type !== filters.movementType) return false;
    if (filters.source && movement.movement_source !== filters.source) return false;

    if (filters.fromDate && new Date(movement.movement_date) < new Date(filters.fromDate)) return false;
    if (filters.toDate && new Date(movement.movement_date) > new Date(filters.toDate)) return false;

    return true;
  });
}
