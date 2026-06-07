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
