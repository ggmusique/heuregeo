/**
 * bilanEngine.js — Règles canoniques de calcul bilan / acompte / impayé.
 *
 * Fonctions pures, sans effets de bord, testables.
 * La SQL `apply_acompte` reste autoritaire pour les écritures SEMAINE en DB ;
 * ce module centralise les règles de calcul pour l'affichage et la normalisation
 * des lignes avant écriture.
 */

/**
 * Règle unique pour le statut payé.
 *
 * Un bilan est payé si paye=true OU si reste_a_percevoir ≤ 0.01 €.
 * Le reste est la source de vérité — le flag paye en est la conséquence.
 *
 * @param {boolean} paye
 * @param {number|string} resteAPercevoir
 * @returns {boolean}
 */
export function computeStatutPaye(paye, resteAPercevoir) {
  const reste = Math.max(0, parseFloat(resteAPercevoir) || 0);
  return paye === true || reste <= 0.01;
}

/**
 * Calcule l'impayé cumulé sur les semaines précédentes.
 *
 * @param {Array<{reste_a_percevoir: number|string}>} bilanRows — lignes bilans_status_v2
 * @returns {number} montant total en €
 */
export function computeImpayePrecedent(bilanRows) {
  return (bilanRows || []).reduce(
    (sum, r) => sum + Math.max(0, parseFloat(r.reste_a_percevoir) || 0),
    0
  );
}

/**
 * Normalise une ligne avant écriture en DB.
 * Garantit l'invariant : paye=true ↔ reste_a_percevoir=0.
 *
 * @param {{
 *   ca_brut_periode?: number,
 *   acompte_consomme?: number,
 *   reste_a_percevoir?: number,
 *   paye?: boolean,
 *   date_paiement?: string|null
 * }} row
 * @returns {object} ligne normalisée
 */
export function normalizeBilanForWrite({
  ca_brut_periode = 0,
  acompte_consomme = 0,
  reste_a_percevoir = 0,
  paye = false,
  date_paiement = null,
} = {}) {
  const reste = Math.max(0, parseFloat(reste_a_percevoir) || 0);
  const isPaye = computeStatutPaye(paye, reste);
  return {
    ca_brut_periode: parseFloat(ca_brut_periode) || 0,
    acompte_consomme: parseFloat(acompte_consomme) || 0,
    reste_a_percevoir: isPaye ? 0 : reste,
    paye: isPaye,
    date_paiement: isPaye ? (date_paiement || new Date().toISOString()) : null,
  };
}

/**
 * Calcule les acomptes consommés sur la période pour l'affichage.
 *
 * - En semaine: on prend la valeur réellement versée sur la période (si positive).
 * - Sinon: on dérive la conso via delta de solde.
 */
export function computeConsommeCettePeriode({
  bilanPeriodType,
  periodTypes,
  acomptesDansPeriodeCalc = 0,
  soldeAvantPeriode = 0,
  acomptesDansPeriode = 0,
  soldeApresPeriode = 0,
}) {
  const isSemaine = periodTypes && bilanPeriodType === periodTypes.SEMAINE;
  const acomptesDansPeriodeNum = parseFloat(acomptesDansPeriode) || 0;
  const soldeAvantPeriodeNum = parseFloat(soldeAvantPeriode) || 0;
  const soldeApresPeriodeNum = parseFloat(soldeApresPeriode) || 0;
  const acomptesDansPeriodeCalcNum = parseFloat(acomptesDansPeriodeCalc) || 0;
  if (isSemaine) {
    return acomptesDansPeriodeCalcNum > 0 ? acomptesDansPeriodeCalcNum : 0;
  }
  return Math.max(0, (soldeAvantPeriodeNum + acomptesDansPeriodeNum) - soldeApresPeriodeNum);
}

/**
 * Calcule l'état acompte d'un bilan hebdomadaire à partir des métriques repository.
 */
export function computeWeeklyAcompteState({
  allocCetteSemaine = 0,
  totalAlloueJusqua = 0,
  totalAlloueAvant = 0,
  acomptesCumules = 0,
  acomptesDansPeriode = 0,
  impayePrecedent = 0,
  caBrutPeriode = 0,
} = {}) {
  const allocCetteSemaineNum = parseFloat(allocCetteSemaine) || 0;
  const totalAlloueJusquaNum = parseFloat(totalAlloueJusqua) || 0;
  const totalAlloueAvantNum = parseFloat(totalAlloueAvant) || 0;
  const acomptesCumulesNum = parseFloat(acomptesCumules) || 0;
  const acomptesDansPeriodeNum = parseFloat(acomptesDansPeriode) || 0;
  const impayePrecedentNum = parseFloat(impayePrecedent) || 0;
  const caBrutPeriodeNum = parseFloat(caBrutPeriode) || 0;

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
