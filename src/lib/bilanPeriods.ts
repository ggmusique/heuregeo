import { PERIOD_TYPES } from "../constants/bilanPeriods";

export function computePeriodeIndex(type: string, value: any): number {
  const v = value?.toString?.() ?? "";
  if (!v) return 0;
  if (type === PERIOD_TYPES.SEMAINE) return parseInt(v, 10) || 0;
  if (type === PERIOD_TYPES.ANNEE) return parseInt(v, 10) || 0;
  if (type === PERIOD_TYPES.MOIS) return parseInt(v.replace("-", ""), 10) || 0;
  return 0;
}

export function formatPeriodLabel(periodType: string, val: any): string {
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
