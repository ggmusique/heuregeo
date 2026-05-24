import { useCallback, useEffect, useMemo, useState } from "react";
import { computeReserveBalanceHours } from "./reserveCalculations";
import { filterReserveHistory, sortReserveHistory } from "./reserveHistory";
import {
  createReserveMovement,
  deleteReserveMovement,
  fetchReserveMovements,
  upsertWeeklySettlement,
} from "./reservePersistence";
import type {
  ReserveHistoryFilters,
  ReserveMovementInput,
  ReserveMovementRow,
  ReserveSyncWeeklyInput,
} from "./reserve.types";

export function useReserve(patronId: string | null) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [movements, setMovements] = useState<ReserveMovementRow[]>([]);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const rows = await fetchReserveMovements(patronId);
      setMovements(rows);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [patronId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const addMovement = useCallback(
    async (input: Omit<ReserveMovementInput, "patronId">) => {
      setSaving(true);
      setError(null);
      try {
        await createReserveMovement({ ...input, patronId });
        await refresh();
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setSaving(false);
      }
    },
    [patronId, refresh],
  );

  const removeMovement = useCallback(
    async (movementId: string) => {
      setSaving(true);
      setError(null);
      try {
        await deleteReserveMovement(movementId);
        await refresh();
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setSaving(false);
      }
    },
    [refresh],
  );

  const syncWeeklySettlement = useCallback(async (input: Omit<ReserveSyncWeeklyInput, "patronId">) => {
    setError(null);
    try {
      await upsertWeeklySettlement({ ...input, patronId });
      await refresh();
    } catch (err) {
      setError((err as Error).message);
    }
  }, [patronId, refresh]);

  const history = useMemo(() => sortReserveHistory(movements), [movements]);
  const balanceHours = useMemo(() => computeReserveBalanceHours(movements), [movements]);

  const getFilteredHistory = useCallback((filters: ReserveHistoryFilters) => {
    return filterReserveHistory(history, filters);
  }, [history]);

  return {
    loading,
    saving,
    error,
    balanceHours,
    movements: history,
    refresh,
    addMovement,
    removeMovement,
    syncWeeklySettlement,
    getFilteredHistory,
  };
}
