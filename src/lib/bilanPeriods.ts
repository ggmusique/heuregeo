import { PERIOD_TYPES } from "../constants/bilanPeriods";
import { getWeekNumber, getWeekStartDate, isValidDateIso } from "../utils/dateUtils";
import type { Mission } from "../types/entities";
import type { BilanGroupedRow } from "../types/bilan";

type WeeklyPaymentSnapshot = {
  paye: boolean;
  datePaiement: string | null;
  resteAPercevoir: number;
};

function buildMonthPaymentMeta(weekNum: number, weeklyPaymentStatus?: Map<number, WeeklyPaymentSnapshot>) {
  const payment = weeklyPaymentStatus?.get(weekNum);
  if (!payment) {
    return {
      paymentStatus: "unknown" as const,
      paymentLabel: "Sans bilan",
      paymentDate: null,
      paymentRemaining: 0,
      paidCount: 0,
      totalCount: 0,
    };
  }

  return {
    paymentStatus: payment.paye ? ("paid" as const) : ("unpaid" as const),
    paymentLabel: payment.paye ? "Payé" : "Non payé",
    paymentDate: payment.datePaiement,
    paymentRemaining: payment.paye ? 0 : payment.resteAPercevoir,
    paidCount: payment.paye ? 1 : 0,
    totalCount: 1,
  };
}

function buildYearPaymentMeta(weekNumbers: number[], weeklyPaymentStatus?: Map<number, WeeklyPaymentSnapshot>) {
  const knownWeeks = weekNumbers
    .map((weekNum) => weeklyPaymentStatus?.get(weekNum))
    .filter((payment): payment is WeeklyPaymentSnapshot => Boolean(payment));

  if (knownWeeks.length === 0) {
    return {
      paymentStatus: "unknown" as const,
      paymentLabel: "Sans bilan",
      paymentDate: null,
      paymentRemaining: 0,
      paidCount: 0,
      totalCount: 0,
    };
  }

  const paidCount = knownWeeks.filter((payment) => payment.paye).length;
  const totalCount = knownWeeks.length;
  const paymentRemaining = knownWeeks.reduce(
    (sum, payment) => sum + (payment.paye ? 0 : payment.resteAPercevoir),
    0,
  );

  if (paidCount === totalCount) {
    return {
      paymentStatus: "paid" as const,
      paymentLabel: totalCount > 1 ? `${paidCount}/${totalCount} semaines payées` : "Payé",
      paymentDate: knownWeeks.map((payment) => payment.datePaiement).find(Boolean) ?? null,
      paymentRemaining: 0,
      paidCount,
      totalCount,
    };
  }

  if (paidCount === 0) {
    return {
      paymentStatus: "unpaid" as const,
      paymentLabel: totalCount > 1 ? `${totalCount} semaines à payer` : "Non payé",
      paymentDate: null,
      paymentRemaining,
      paidCount,
      totalCount,
    };
  }

  return {
    paymentStatus: "partial" as const,
    paymentLabel: `${paidCount}/${totalCount} semaines payées`,
    paymentDate: null,
    paymentRemaining,
    paidCount,
    totalCount,
  };
}

function isValidMonthValue(value: string): boolean {
  const match = /^(\d{4})-(\d{2})$/.exec(value);
  if (!match) return false;
  const month = Number(match[2]);
  return month >= 1 && month <= 12;
}

function getMissionIsoDate(mission: Mission): string | null {
  const candidate = mission.date_iso || mission.date_mission;
  return candidate && isValidDateIso(candidate) ? candidate : null;
}

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
  if (periodType === PERIOD_TYPES.MOIS && isValidMonthValue(sVal)) {
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
    if (!isValidMonthValue(periodValue)) {
      return { debutPeriode: "", finPeriode: "" };
    }
    const debutPeriode = `${periodValue}-01`;
    const [year, month] = periodValue.split("-").map(Number);
    return { debutPeriode, finPeriode: new Date(year, month, 0).toISOString().split("T")[0] };
  }
  return { debutPeriode: `${periodValue}-01-01`, finPeriode: `${periodValue}-12-31` };
}

/**
 * Regroupe les missions par semaine (pour vue MOIS) ou par mois (pour vue ANNEE).
 */
export function buildGroupedData(
  missions: Mission[],
  periodType: string,
  weeklyPaymentStatus?: Map<number, WeeklyPaymentSnapshot>,
): BilanGroupedRow[] {
  if (periodType === PERIOD_TYPES.MOIS && missions.length > 0) {
    const weekMap = new Map<number, { wn: number; h: number; e: number; missions: Mission[] }>();
    missions.forEach((m) => {
      const missionDate = getMissionIsoDate(m);
      if (!missionDate) return;
      const wn = getWeekNumber(new Date(missionDate));
      if (!weekMap.has(wn)) weekMap.set(wn, { wn, h: 0, e: 0, missions: [] });
      const w = weekMap.get(wn)!;
      w.h += m.duree || 0;
      w.e += m.montant || 0;
      w.missions.push(m);
    });
    return Array.from(weekMap.values())
      .sort((a, b) => a.wn - b.wn)
      .map(({ wn, h, e, missions: ms }) => ({
        label: `Semaine ${wn}`,
        periodValue: String(wn),
        h,
        e,
        missions: ms,
        ...buildMonthPaymentMeta(wn, weeklyPaymentStatus),
      }));
  }
  if (periodType === PERIOD_TYPES.ANNEE && missions.length > 0) {
    const monthMap = new Map<string, { key: string; h: number; e: number; missions: Mission[] }>();
    missions.forEach((m) => {
      const missionDate = getMissionIsoDate(m);
      if (!missionDate) return;
      const key = missionDate.substring(0, 7);
      if (!monthMap.has(key)) monthMap.set(key, { key, h: 0, e: 0, missions: [] });
      const mo = monthMap.get(key)!;
      mo.h += m.duree || 0;
      mo.e += m.montant || 0;
      mo.missions.push(m);
    });
    return Array.from(monthMap.values())
      .sort((a, b) => a.key.localeCompare(b.key))
      .map(({ key, h, e, missions: ms }) => {
        const weekNumbers = Array.from(
          new Set(
            ms
              .map((mission) => getMissionIsoDate(mission))
              .filter((missionDate): missionDate is string => Boolean(missionDate))
              .map((missionDate) => getWeekNumber(new Date(missionDate))),
          ),
        ).sort((a, b) => a - b);
        const paymentMeta = buildYearPaymentMeta(weekNumbers, weeklyPaymentStatus);
        const [yr, mn] = key.split("-");
        if (!isValidMonthValue(key)) {
          return {
            label: key,
            periodValue: key,
            childPeriodValues: weekNumbers.map(String),
            h,
            e,
            missions: ms,
            ...paymentMeta,
          };
        }
        const label = new Date(Number(yr), parseInt(mn) - 1)
          .toLocaleString("fr-FR", { month: "long" })
          .toUpperCase();
        return {
          label,
          periodValue: key,
          childPeriodValues: weekNumbers.map(String),
          h,
          e,
          missions: ms,
          ...paymentMeta,
        };
      });
  }
  return [];
}
