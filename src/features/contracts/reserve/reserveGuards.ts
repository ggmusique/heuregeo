/**
 * reserveGuards.ts
 *
 * Règles de verrouillage PURES pour la banque d'heures.
 *
 * Règle métier : une semaine marquée comme PAYÉE est gelée. Aucun mouvement
 * de réserve (synchro automatique du contrat, comblement de déficit) ne doit
 * plus la modifier — on ne revient jamais sur une semaine clôturée.
 *
 * ⚠️ Aucune dépendance DB / Supabase / side-effect. Testable en isolation.
 */

/**
 * True si la semaine est gelée (déjà payée).
 * Une semaine gelée n'autorise aucune mutation de réserve.
 */
export function isReserveWeekLocked(paye: boolean | null | undefined): boolean {
	return paye === true;
}

/**
 * True si la synchronisation hebdomadaire de la banque (crédit du surplus)
 * est autorisée sur cette semaine.
 */
export function canSyncWeeklySettlement(
	paye: boolean | null | undefined,
): boolean {
	return !isReserveWeekLocked(paye);
}

/**
 * True si un retrait (comblement de déficit depuis la banque) est autorisé
 * sur cette semaine.
 */
export function canWithdrawFromReserve(
	paye: boolean | null | undefined,
): boolean {
	return !isReserveWeekLocked(paye);
}

/**
 * True si `value` est une valeur de semaine plausible (numéro de semaine).
 *
 * Garde-fou anti-corruption : la synchro hebdomadaire de la banque ne doit
 * s'exécuter QUE pour une vraie semaine. Lors d'une navigation Mois/Année →
 * Semaine, un rendu transitoire peut présenter un periodType "semaine" avec un
 * periodValue encore égal à l'année ("2026") ou au mois ("2026-04"). Sans cette
 * garde, tout le surplus de la période est alors crédité en banque sous une
 * fausse "semaine 2026".
 *
 * Une valeur de semaine valide est un entier 1..53 (ex: "22"). "2026" et
 * "2026-04" sont rejetés.
 */
export function isValidWeekValue(
	value: string | number | null | undefined,
): boolean {
	if (value === null || value === undefined) return false;
	const trimmed = String(value).trim();
	if (!/^\d{1,2}$/.test(trimmed)) return false;
	const week = Number(trimmed);
	return Number.isInteger(week) && week >= 1 && week <= 53;
}
