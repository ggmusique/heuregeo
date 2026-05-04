import { useState, useCallback, useMemo, Dispatch, SetStateAction } from "react";
import { getWeekNumber } from "../utils/dateUtils";
import { PERIOD_TYPES } from "../constants/bilanPeriods";
import { computePeriodeIndex, formatPeriodLabel } from "../lib/bilanPeriods";
import type { Mission } from "../types/entities";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface UseBilanPeriodReturn {
  bilanPeriodType: string;
  setBilanPeriodType: Dispatch<SetStateAction<string>>;
  bilanPeriodValue: string;
  setBilanPeriodValue: Dispatch<SetStateAction<string>>;
  availablePeriods: (number | string)[];
  calculerPeriodesDisponibles: () => void;
  formatCurrentPeriodLabel: (val: string | number) => string;
  gotoPreviousWeek: () => void;
  gotoNextWeek: () => void;
  hasPreviousWeek: boolean;
  hasNextWeek: boolean;
  handleWeekChange: (newValue: string) => void;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useBilanPeriod({ missions }: { missions: Mission[] }): UseBilanPeriodReturn {
  const [bilanPeriodType, setBilanPeriodType] = useState<string>("semaine");
  const [bilanPeriodValue, setBilanPeriodValue] = useState<string>("");
  const [availablePeriods, setAvailablePeriods] = useState<(number | string)[]>([]);

  const calculerPeriodesDisponibles = useCallback((): void => {
    const periods = new Set<number | string>();
    missions.forEach((m) => {
      const mDate = m?.date_mission || m?.date_iso;
      if (!mDate) return;
      const d = new Date(mDate);
      if (bilanPeriodType === PERIOD_TYPES.SEMAINE) {
        periods.add(getWeekNumber(d));
      } else if (bilanPeriodType === PERIOD_TYPES.MOIS) {
        periods.add(mDate.substring(0, 7));
      } else if (bilanPeriodType === PERIOD_TYPES.ANNEE) {
        periods.add(mDate.substring(0, 4));
      }
    });
    const sorted = Array.from(periods).sort(
      (a, b) => computePeriodeIndex(bilanPeriodType, b) - computePeriodeIndex(bilanPeriodType, a)
    );
    setAvailablePeriods(sorted);
    if (sorted.length > 0) {
      setBilanPeriodValue(sorted[0].toString());
    }
  }, [missions, bilanPeriodType]);

  const formatCurrentPeriodLabel = useCallback(
    (val: string | number): string => formatPeriodLabel(bilanPeriodType, val),
    [bilanPeriodType]
  );

  const gotoPreviousWeek = useCallback((): void => {
    const currentIndex = availablePeriods.indexOf(bilanPeriodValue);
    if (currentIndex < availablePeriods.length - 1) {
      setBilanPeriodValue(availablePeriods[currentIndex + 1].toString());
    }
  }, [availablePeriods, bilanPeriodValue]);

  const gotoNextWeek = useCallback((): void => {
    const currentIndex = availablePeriods.indexOf(bilanPeriodValue);
    if (currentIndex > 0) {
      setBilanPeriodValue(availablePeriods[currentIndex - 1].toString());
    }
  }, [availablePeriods, bilanPeriodValue]);

  const hasPreviousWeek = useMemo((): boolean => {
    const currentIndex = availablePeriods.indexOf(bilanPeriodValue);
    return currentIndex < availablePeriods.length - 1;
  }, [availablePeriods, bilanPeriodValue]);

  const hasNextWeek = useMemo((): boolean => {
    const currentIndex = availablePeriods.indexOf(bilanPeriodValue);
    return currentIndex > 0;
  }, [availablePeriods, bilanPeriodValue]);

  const handleWeekChange = useCallback((newValue: string): void => {
    setBilanPeriodValue(newValue);
  }, []);

  return {
    bilanPeriodType,
    setBilanPeriodType,
    bilanPeriodValue,
    setBilanPeriodValue,
    availablePeriods,
    calculerPeriodesDisponibles,
    formatCurrentPeriodLabel,
    gotoPreviousWeek,
    gotoNextWeek,
    hasPreviousWeek,
    hasNextWeek,
    handleWeekChange,
  };
}
