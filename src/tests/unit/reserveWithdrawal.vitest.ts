/**
 * reserveWithdrawal.vitest.ts
 *
 * Tests W1–W18 : calculs de déficit, retraits réserve et semaine planifiée.
 * Tous les tests sont purement unitaires (aucun appel Supabase).
 *
 * ▶ Exécution :
 *   npx vitest run src/tests/unit/reserveWithdrawal.vitest.ts --pool=threads
 */

import { describe, expect, it } from "vitest";
import {
  computeBalanceAfterWithdrawal,
  computeDeficit,
  computeDeficitAfterWithdrawal,
  computeMaxWithdrawal,
  computePayableHoursAfterWithdrawal,
  computePlannedWeekAllocation,
  computeWithdrawalAmount,
  isWeekInPast,
  simulateWithdrawals,
} from "../../features/contracts/reserve/reserveWithdrawal";

// ─── CALCULS DE BASE ──────────────────────────────────────────────────────────

describe("W1 — Calcul déficit simple", () => {
  it("retourne 10h quand travaillées=10h, contrat=20h", () => {
    expect(computeDeficit(10, 20)).toBe(10);
  });
});

describe("W2 — Pas de déficit (exact)", () => {
  it("retourne 0 quand travaillées=20h = contrat=20h", () => {
    expect(computeDeficit(20, 20)).toBe(0);
  });
});

describe("W3 — Pas de déficit (dépassement)", () => {
  it("retourne 0 quand travaillées=25h > contrat=20h", () => {
    expect(computeDeficit(25, 20)).toBe(0);
  });
});

describe("W4 — Conversion heures → euros", () => {
  it("5h × 17.50 €/h = 87.50 €", () => {
    expect(computeWithdrawalAmount(5, 17.5)).toBe(87.5);
  });
});

describe("W5 — Conversion avec décimales", () => {
  it("2.5h × 17.50 €/h = 43.75 €", () => {
    expect(computeWithdrawalAmount(2.5, 17.5)).toBe(43.75);
  });
});

// ─── LIMITES ET CONTRAINTES ───────────────────────────────────────────────────

describe("W6 — Comblement total possible", () => {
  it("déficit=10h, solde=15h → max_retrait=10h (plafonné au déficit)", () => {
    expect(computeMaxWithdrawal(10, 15)).toBe(10);
  });
});

describe("W7 — Comblement partiel (banque insuffisante)", () => {
  it("déficit=10h, solde=6h → max_retrait=6h (plafonné au solde)", () => {
    expect(computeMaxWithdrawal(10, 6)).toBe(6);
  });

  it("solde < déficit → comblement partiel détectable", () => {
    const deficit = 10;
    const balance = 6;
    const max = computeMaxWithdrawal(deficit, balance);
    // Partiel = le max de retrait < le déficit total
    expect(max).toBeLessThan(deficit);
    expect(max).toBe(balance);
  });
});

describe("W8 — Banque vide", () => {
  it("déficit=10h, solde=0h → max_retrait=0", () => {
    expect(computeMaxWithdrawal(10, 0)).toBe(0);
  });
});

describe("W9 — Retrait ne peut pas rendre le solde négatif", () => {
  it("solde=5h, tentative=8h → retrait bloqué à 5h, solde après = 0", () => {
    const balance = 5;
    const attempt = 8;
    const balanceAfter = computeBalanceAfterWithdrawal(balance, attempt);
    expect(balanceAfter).toBe(0);
    expect(balanceAfter).toBeGreaterThanOrEqual(0);
  });
});

// ─── MISE À JOUR DU BILAN APRÈS RETRAIT ──────────────────────────────────────

describe("W10 — Bilan recalculé après comblement total", () => {
  it("travaillées=10h, piochées=10h, contrat=20h → payable=20h", () => {
    expect(computePayableHoursAfterWithdrawal(10, 10, 20)).toBe(20);
  });

  it("déficit après = 0 → carte disparaît", () => {
    expect(computeDeficitAfterWithdrawal(10, 10, 20)).toBe(0);
  });
});

describe("W11 — Comblement partiel — bilan intermédiaire", () => {
  it("travaillées=10h, piochées=6h, contrat=20h → payable=16h", () => {
    expect(computePayableHoursAfterWithdrawal(10, 6, 20)).toBe(16);
  });

  it("déficit restant = 4h → carte reste visible", () => {
    expect(computeDeficitAfterWithdrawal(10, 6, 20)).toBe(4);
  });
});

describe("W12 — Solde réserve décrémenté après retrait", () => {
  it("solde_avant=15.5h, retrait=6h → solde_après=9.5h", () => {
    expect(computeBalanceAfterWithdrawal(15.5, 6)).toBe(9.5);
  });
});

// ─── MODE B : SEMAINE PLANIFIÉE ───────────────────────────────────────────────

describe("W13 — Allocation semaine vide complète", () => {
  it("contrat=20h, solde=25h, demandé=20h → alloué=20h, solde_après=5h", () => {
    const allocated = computePlannedWeekAllocation(20, 25, 20);
    expect(allocated).toBe(20);
    expect(computeBalanceAfterWithdrawal(25, allocated)).toBe(5);
  });
});

describe("W14 — Allocation partielle semaine vide", () => {
  it("contrat=20h, solde=12h, demandé=20h → alloué=12h (plafonné au solde)", () => {
    const allocated = computePlannedWeekAllocation(20, 12, 20);
    expect(allocated).toBe(12);
  });
});

describe("W15 — Impossible de planifier une semaine passée", () => {
  it("semaine passée (lundi < aujourd'hui) → isWeekInPast = true", () => {
    // "aujourd'hui" = 2026-05-25 (lundi)
    // semaine passée = lundi 2026-05-18
    expect(isWeekInPast("2026-05-18", "2026-05-25")).toBe(true);
  });

  it("semaine courante (lundi = aujourd'hui) → isWeekInPast = true (non planifiable)", () => {
    expect(isWeekInPast("2026-05-25", "2026-05-25")).toBe(true);
  });

  it("semaine future (lundi > aujourd'hui) → isWeekInPast = false", () => {
    expect(isWeekInPast("2026-06-01", "2026-05-25")).toBe(false);
  });
});

describe("W16 — Impossible de planifier si solde = 0", () => {
  it("solde=0h → max allocation = 0h", () => {
    expect(computePlannedWeekAllocation(20, 0, 20)).toBe(0);
  });

  it("solde=0h → computeMaxWithdrawal = 0", () => {
    expect(computeMaxWithdrawal(10, 0)).toBe(0);
  });
});

// ─── INTÉGRITÉ GLOBALE ────────────────────────────────────────────────────────

describe("W17 — Plusieurs retraits successifs", () => {
  it("solde=20h → retrait 5h → 8h → 10h (plafonné) → solde final = 0h", () => {
    const { steps, finalBalance } = simulateWithdrawals(20, [
      { hours: 5 },
      { hours: 8 },
      { hours: 10 },
    ]);

    expect(steps[0].applied).toBe(5);
    expect(steps[0].balanceAfter).toBe(15);

    expect(steps[1].applied).toBe(8);
    expect(steps[1].balanceAfter).toBe(7);

    // 3e retrait : demande 10h mais solde = 7h → plafonné à 7h
    expect(steps[2].requested).toBe(10);
    expect(steps[2].applied).toBe(7);
    expect(steps[2].balanceAfter).toBe(0);

    expect(finalBalance).toBe(0);
  });
});

describe("W18 — Total retraits tracés dans l'historique", () => {
  it("3 retraits effectués → 3 entrées, somme = total retiré", () => {
    const initial = 20;
    const { steps, finalBalance } = simulateWithdrawals(initial, [
      { hours: 5 },
      { hours: 8 },
      { hours: 7 },
    ]);

    expect(steps).toHaveLength(3);

    const totalWithdrawn = steps.reduce((sum, s) => sum + s.applied, 0);
    expect(totalWithdrawn).toBe(20);
    expect(finalBalance).toBe(0);

    // Chaque étape est une "entrée" de type retrait
    for (const step of steps) {
      expect(step.applied).toBeGreaterThanOrEqual(0);
    }
  });
});
