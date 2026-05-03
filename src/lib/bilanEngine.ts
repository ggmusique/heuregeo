/**
 * bilanEngine.ts — Règles canoniques de calcul bilan / acompte / impayé.
 *
 * Fonctions pures, sans effets de bord, testables.
 * La SQL `apply_acompte` reste autoritaire pour les écritures SEMAINE en DB ;
 * ce module centralise les règles de calcul pour l'affichage et la normalisation
 * des lignes avant écriture.
 */

import type { NormalizedBilanPayload, WeeklyAcompteState, StandardAcompteState } from "../types/bilan.ts";

export function computeStatutPaye(paye: boolean, resteAPercevoir: number | string): boolean {
  const reste = Math.max(0, parseFloat(resteAPercevoir as string) || 0);
  return paye === true || reste <= 0.01;
}

export function computeImpayePrecedent(bilanRows: Array<{ reste_a_percevoir: number | string }>): number {
  return (bilanRows || []).reduce(
    (sum, r) => sum + Math.max(0, parseFloat(r.reste_a_percevoir as string) || 0),
    0
  );
}

export function normalizeBilanForWrite({
  ca_brut_periode = 0,
  acompte_consomme = 0,
  reste_a_percevoir = 0,
  paye = false,
  date_paiement = null,
}: {
  ca_brut_periode?: number | string;
  acompte_consomme?: number | string;
  reste_a_percevoir?: number | string;
  paye?: boolean;
  date_paiement?: string | null;
} = {}): NormalizedBilanPayload {
  const reste = Math.max(0, parseFloat(reste_a_percevoir as string) || 0);
  const isPaye = computeStatutPaye(paye, reste);
  return {
    ca_brut_periode: parseFloat(ca_brut_periode as string) || 0,
    acompte_consomme: parseFloat(acompte_consomme as string) || 0,
    reste_a_percevoir: isPaye ? 0 : reste,
    paye: isPaye,
    date_paiement: isPaye ? (date_paiement || new Date().toISOString()) : null,
  };
}

export function computeConsommeCettePeriode({
  bilanPeriodType,
  periodTypes,
  acomptesDansPeriodeCalc = 0,
  soldeAvantPeriode = 0,
  acomptesDansPeriode = 0,
  soldeApresPeriode = 0,
}: {
  bilanPeriodType: string;
  periodTypes?: { SEMAINE: string } | null;
  acomptesDansPeriodeCalc?: number | string;
  soldeAvantPeriode?: number | string;
  acomptesDansPeriode?: number | string;
  soldeApresPeriode?: number | string;
}): number {
  const isSemaine = periodTypes && bilanPeriodType === periodTypes.SEMAINE;
  const acomptesDansPeriodeNum = parseFloat(acomptesDansPeriode as string) || 0;
  const soldeAvantPeriodeNum = parseFloat(soldeAvantPeriode as string) || 0;
  const soldeApresPeriodeNum = parseFloat(soldeApresPeriode as string) || 0;
  const acomptesDansPeriodeCalcNum = parseFloat(acomptesDansPeriodeCalc as string) || 0;
  if (isSemaine) {
    return acomptesDansPeriodeCalcNum > 0 ? acomptesDansPeriodeCalcNum : 0;
  }
  return Math.max(0, (soldeAvantPeriodeNum + acomptesDansPeriodeNum) - soldeApresPeriodeNum);
}

export function computeWeeklyAcompteState({
  allocCetteSemaine = 0,
  totalAlloueJusqua = 0,
  totalAlloueAvant = 0,
  acomptesCumules = 0,
  acomptesDansPeriode = 0,
  impayePrecedent = 0,
  caBrutPeriode = 0,
}: {
  allocCetteSemaine?: number | string;
  totalAlloueJusqua?: number | string;
  totalAlloueAvant?: number | string;
  acomptesCumules?: number | string;
  acomptesDansPeriode?: number | string;
  impayePrecedent?: number | string;
  caBrutPeriode?: number | string;
} = {}): WeeklyAcompteState {
  const allocCetteSemaineNum = parseFloat(allocCetteSemaine as string) || 0;
  const totalAlloueJusquaNum = parseFloat(totalAlloueJusqua as string) || 0;
  const totalAlloueAvantNum = parseFloat(totalAlloueAvant as string) || 0;
  const acomptesCumulesNum = parseFloat(acomptesCumules as string) || 0;
  const acomptesDansPeriodeNum = parseFloat(acomptesDansPeriode as string) || 0;
  const impayePrecedentNum = parseFloat(impayePrecedent as string) || 0;
  const caBrutPeriodeNum = parseFloat(caBrutPeriode as string) || 0;

  const acompteConsomme = allocCetteSemaineNum;
  const soldeAvantPeriode = Math.max(0, acomptesCumulesNum - totalAlloueAvantNum - acomptesDansPeriodeNum);
  const soldeApresPeriode = Math.max(0, acomptesCumulesNum - totalAlloueJusquaNum);
  const detteTotale = impayePrecedentNum + caBrutPeriodeNum;
  const resteCettePeriode = Math.max(0, detteTotale - acompteConsomme);

  return {
    acompteConsomme,
    soldeAvantPeriode,
    soldeApresPeriode,
    resteCettePeriode,
    resteAPercevoir: resteCettePeriode,
  };
}

export function computeStandardAcompteState({
  soldeAvantPeriode = 0,
  acomptesDansPeriode = 0,
  caBrutPeriode = 0,
}: {
  soldeAvantPeriode?: number | string;
  acomptesDansPeriode?: number | string;
  caBrutPeriode?: number | string;
} = {}): StandardAcompteState {
  const soldeAvantPeriodeNum = parseFloat(soldeAvantPeriode as string) || 0;
  const acomptesDansPeriodeNum = parseFloat(acomptesDansPeriode as string) || 0;
  const caBrutPeriodeNum = parseFloat(caBrutPeriode as string) || 0;

  const acompteDisponible = soldeAvantPeriodeNum + acomptesDansPeriodeNum;
  const acompteConsomme = Math.min(acompteDisponible, caBrutPeriodeNum);
  const resteCettePeriode = caBrutPeriodeNum - acompteConsomme;
  const soldeApresPeriode = acompteDisponible - acompteConsomme;

  return {
    acompteConsomme,
    resteCettePeriode,
    resteAPercevoir: resteCettePeriode,
    soldeApresPeriode,
  };
}
