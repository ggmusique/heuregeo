/**
 * bilanConstants.js — Constantes et helpers purs partagés par les sous-modules bilan.
 *
 * Extrait de useBilan.js pour éviter la duplication et centraliser la configuration.
 */

import { getWeekStartDate } from "../../utils/dateUtils";

/** UUID sentinel pour "tous les patrons" (bilan global) */
export const GLOBAL_PATRON_ID = "00000000-0000-0000-0000-000000000000";

/** Table Supabase pour les bilans */
export const BILANS_TABLE = "bilans_status_v2";

/** Types de période */
export const PERIOD_TYPES = {
  SEMAINE: "semaine",
  MOIS: "mois",
  ANNEE: "annee",
};

/**
 * Retourne l'ID patron effectif (remplace null/undefined par GLOBAL_PATRON_ID).
 * @param {string|null} patronId
 * @returns {string}
 */
export const effectivePatronId = (patronId) =>
  patronId ? patronId : GLOBAL_PATRON_ID;

/**
 * Vérifie si un patronId correspond au patron global.
 * @param {string|null} patronId
 * @returns {boolean}
 */
export const isGlobalPatronId = (patronId) =>
  !patronId || patronId === GLOBAL_PATRON_ID;

/**
 * Résout le nom d'un patron à partir de la liste.
 * @param {string} patronId
 * @param {Array} patrons
 * @returns {string}
 */
export const resolvePatronNom = (patronId, patrons = []) => {
  if (isGlobalPatronId(patronId)) return "Global";
  const p = patrons.find((x) => x.id === patronId);
  return p?.nom || "Inconnu";
};

/**
 * Calcule l'index numérique d'une période (pour le tri et les requêtes).
 * @param {string} type - Type de période (semaine/mois/annee)
 * @param {string|number} value - Valeur de la période
 * @returns {number}
 */
export const computePeriodeIndex = (type, value) => {
  const v = value?.toString?.() ?? "";
  if (!v) return 0;
  if (type === PERIOD_TYPES.SEMAINE) return parseInt(v, 10) || 0;
  if (type === PERIOD_TYPES.ANNEE) return parseInt(v, 10) || 0;
  if (type === PERIOD_TYPES.MOIS) return parseInt(v.replace("-", ""), 10) || 0;
  return 0;
};

/**
 * Calcule les dates de début et fin d'une période.
 * @param {string} periodType
 * @param {string} periodValue
 * @returns {{ debutPeriode: string, finPeriode: string }}
 */
export const computePeriodeDates = (periodType, periodValue) => {
  let debutPeriode = "";
  let finPeriode = "";

  if (periodType === PERIOD_TYPES.SEMAINE) {
    const weekNum = parseInt(periodValue, 10);
    const year = new Date().getFullYear();
    debutPeriode = getWeekStartDate(weekNum, year);
    const finDate = new Date(debutPeriode);
    finDate.setDate(finDate.getDate() + 6);
    finPeriode = finDate.toISOString().split("T")[0];
  } else if (periodType === PERIOD_TYPES.MOIS) {
    debutPeriode = `${periodValue}-01`;
    const [year, month] = periodValue.split("-").map(Number);
    const last = new Date(year, month, 0);
    finPeriode = last.toISOString().split("T")[0];
  } else {
    debutPeriode = `${periodValue}-01-01`;
    finPeriode = `${periodValue}-12-31`;
  }

  return { debutPeriode, finPeriode };
};
