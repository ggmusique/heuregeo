import { PERIOD_TYPES } from "../constants/bilanPeriods";
import { getWeekNumber, getWeekStartDate } from "../utils/dateUtils";
import type { Mission } from "../types/entities";
import type { BilanGroupedRow } from "../types/bilan";

export function computePeriodeIndex(type: string, value: string | number): number {
  const v = value?.toString?.() ?? "";
  if (!v) return 0;
  if (type === PERIOD_TYPES.SEMAINE) return parseInt(v, 10) || 0;
  if (type === PERIOD_TYPES.ANNEE) return parseInt(v, 10) || 0;
  if (type === PERIOD_TYPES.MOIS) return parseInt(v.replace("-", ""), 10) || 0;
  return 0;
}

export function formatPeriodLabel(periodType: string, val: string | number): string {
  if (!val) return "";
  const sVal = val.toString();
  if (periodType === PERIOD_TYPES.SEMAINE) return `Semaine ${sVal}`;
  if (periodType === PERIOD_TYPES.MOIS && sVal.includes("-")) {
    const [y, m] = sVal.split("-");
    return new Date(Number(y), Number(m) - 1)
      .toLocaleString("fr-FR", { month: "long", year: "numeric" })
      .toUpperCase();
  }
  return sVal;
}

/**
 * Calcule les dates de début et de fin pour une période donnée.
 */
export function computePeriodDates(
  periodType: string,
  periodValue: string
): { debutPeriode: string; finPeriode: string } {
  if (periodType === PERIOD_TYPES.SEMAINE) {
    const weekNum = parseInt(periodValue, 10);
    const year = new Date().getFullYear();
    const debutPeriode = getWeekStartDate(weekNum, year);
    const fin = new Date(debutPeriode);
    fin.setDate(fin.getDate() + 6);
    return { debutPeriode, finPeriode: fin.toISOString().split("T")[0] };
  }
  if (periodType === PERIOD_TYPES.MOIS) {
    const debutPeriode = `${periodValue}-01`;
    const [year, month] = periodValue.split("-").map(Number);
    return { debutPeriode, finPeriode: new Date(year, month, 0).toISOString().split("T")[0] };
  }
  return { debutPeriode: `${periodValue}-01-01`, finPeriode: `${periodValue}-12-31` };
}

/**
 * Regroupe les missions par semaine (pour vue MOIS) ou par mois (pour vue ANNEE).
 */
export function buildGroupedData(missions: Mission[], periodType: string): BilanGroupedRow[] {
  if (periodType === PERIOD_TYPES.MOIS && missions.length > 0) {
    const weekMap = new Map<number, { wn: number; h: number; e: number; missions: Mission[] }>();
    missions.forEach((m) => {
      const wn = getWeekNumber(new Date(m.date_iso!));
      if (!weekMap.has(wn)) weekMap.set(wn, { wn, h: 0, e: 0, missions: [] });
      const w = weekMap.get(wn)!;
      w.h += m.duree || 0;
      w.e += m.montant || 0;
      w.missions.push(m);
    });
    return Array.from(weekMap.values())
      .sort((a, b) => a.wn - b.wn)
      .map(({ wn, h, e, missions: ms }) => ({ label: `Semaine ${wn}`, h, e, missions: ms }));
  }
  if (periodType === PERIOD_TYPES.ANNEE && missions.length > 0) {
    const monthMap = new Map<string, { key: string; h: number; e: number; missions: Mission[] }>();
    missions.forEach((m) => {
      const key = m.date_iso!.substring(0, 7);
      if (!monthMap.has(key)) monthMap.set(key, { key, h: 0, e: 0, missions: [] });
      const mo = monthMap.get(key)!;
      mo.h += m.duree || 0;
      mo.e += m.montant || 0;
      mo.missions.push(m);
    });
    return Array.from(monthMap.values())
      .sort((a, b) => a.key.localeCompare(b.key))
      .map(({ key, h, e, missions: ms }) => {
        const [yr, mn] = key.split("-");
        const label = new Date(Number(yr), parseInt(mn) - 1)
          .toLocaleString("fr-FR", { month: "long" })
          .toUpperCase();
        return { label, h, e, missions: ms };
      });
  }
  return [];
}
