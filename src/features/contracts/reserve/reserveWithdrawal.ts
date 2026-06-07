/**
 * reserveWithdrawal.ts
 *
 * Fonctions de calcul PURES pour la gestion du déficit contrat et des
 * retraits depuis la banque d'heures.
 *
 * ⚠️ Ce module ne contient aucun appel DB / Supabase / side-effects.
 * Toutes les fonctions sont testables en isolation (vitest unit).
 */

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function san(value: number | null | undefined): number {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? Math.max(0, n) : 0;
}

// ─── Déficit ──────────────────────────────────────────────────────────────────

/**
 * Calcule les heures manquantes par rapport au quota contractuel.
 * Retourne 0 si les heures travaillées >= quota (pas de déficit).
 */
export function computeDeficit(workedHours: number, quotaHours: number): number {
  return round2(Math.max(0, san(quotaHours) - san(workedHours)));
}

// ─── Retrait depuis la banque ─────────────────────────────────────────────────

/**
 * Heures maximum pouvant être piochées dans la banque.
 * Plafonnées au minimum de (déficit, solde disponible).
 */
export function computeMaxWithdrawal(deficit: number, balanceHours: number): number {
  return round2(Math.min(san(deficit), san(balanceHours)));
}

/**
 * Retrait "tout-ou-rien" pour combler le déficit d'une semaine.
 * Renvoie le déficit complet si la banque le couvre entièrement, sinon 0.
 * (Aucun comblement partiel : on comble tout, ou rien.)
 */
export function computeDeficitCoverWithdrawal(
  deficit: number,
  balanceHours: number,
): number {
  const d = san(deficit);
  const b = san(balanceHours);
  return b >= d ? round2(d) : 0;
}

/**
 * Montant en euros correspondant à un retrait en heures.
 */
export function computeWithdrawalAmount(hours: number, hourlyRate: number): number {
  return round2(san(hours) * san(hourlyRate));
}

/**
 * Solde banque après retrait. Jamais négatif.
 * Le retrait est automatiquement plafonné au solde disponible.
 */
export function computeBalanceAfterWithdrawal(
  balanceHours: number,
  withdrawalHours: number,
): number {
  const clamped = round2(Math.min(san(withdrawalHours), san(balanceHours)));
  return round2(Math.max(0, san(balanceHours) - clamped));
}

/**
 * Heures payables après comblement partiel ou total du déficit.
 * = min(heures travaillées + heures piochées, quota contractuel)
 */
export function computePayableHoursAfterWithdrawal(
  workedHours: number,
  withdrawnHours: number,
  quotaHours: number,
): number {
  const effective = san(workedHours) + san(withdrawnHours);
  return round2(Math.min(effective, san(quotaHours)));
}

/**
 * Déficit restant après un retrait partiel ou total.
 */
export function computeDeficitAfterWithdrawal(
  workedHours: number,
  withdrawnHours: number,
  quotaHours: number,
): number {
  return computeDeficit(san(workedHours) + san(withdrawnHours), quotaHours);
}

// ─── Mode B : semaine planifiée ───────────────────────────────────────────────

/**
 * Calcule les heures allouables pour une semaine planifiée (vacances/maladie).
 * Plafonnées au min(quotaHours, balanceHours, requestedHours).
 */
export function computePlannedWeekAllocation(
  quotaHours: number,
  balanceHours: number,
  requestedHours: number,
): number {
  const cap = round2(Math.min(san(quotaHours), san(balanceHours)));
  return round2(Math.min(san(requestedHours), cap));
}

/**
 * Retourne true si la semaine ISO est déjà passée ou en cours.
 * Une semaine est "passée" si son lundi ISO est strictement antérieur à aujourd'hui.
 * Seules les semaines futures (lundi > aujourd'hui) sont planifiables.
 *
 * @param weekStartIso - Date ISO "YYYY-MM-DD" du lundi de la semaine
 * @param nowIso - Optionnel : date de référence "YYYY-MM-DD" (pour tests)
 */
export function isWeekInPast(weekStartIso: string, nowIso?: string): boolean {
  const ref = nowIso ? new Date(`${nowIso}T00:00:00`) : new Date();
  const today = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate());

  const weekStart = new Date(`${weekStartIso}T00:00:00`);
  if (Number.isNaN(weekStart.getTime())) return true;

  // Strictement futur uniquement (lundi > aujourd'hui)
  return weekStart <= today;
}

// ─── Simulation de retraits successifs ───────────────────────────────────────

export interface WithdrawalStep {
  hours: number;
}

export interface WithdrawalLedger {
  steps: Array<{ requested: number; applied: number; balanceAfter: number }>;
  finalBalance: number;
}

/**
 * Simule une série de retraits sur un solde initial.
 * Chaque retrait est plafonné au solde disponible au moment du retrait.
 * Le solde ne peut jamais devenir négatif.
 */
export function simulateWithdrawals(
  initialBalance: number,
  requests: WithdrawalStep[],
): WithdrawalLedger {
  let balance = san(initialBalance);
  const steps: WithdrawalLedger["steps"] = [];

  for (const req of requests) {
    const applied = round2(Math.min(san(req.hours), balance));
    balance = round2(Math.max(0, balance - applied));
    steps.push({ requested: san(req.hours), applied, balanceAfter: balance });
  }

  return { steps, finalBalance: balance };
}
