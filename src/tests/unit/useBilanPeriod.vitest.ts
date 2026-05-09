import { renderHook, act } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { useBilanPeriod } from "../../hooks/useBilanPeriod";
import { getWeekNumber } from "../../utils/dateUtils";
import type { Mission } from "../../types/entities";

// ─── Pas de vi.mock() — le hook utilise uniquement des utilitaires purs.

beforeEach(() => vi.clearAllMocks());

// ─── Factory ──────────────────────────────────────────────────────────────────

function makeMission(dateIso: string): Mission {
  return {
    id: `m-${dateIso}`,
    user_id: "uid",
    patron_id: null,
    client_id: null,
    lieu_id: null,
    client: null,
    lieu: null,
    date_mission: dateIso,
    date_iso: dateIso,
    debut: "09:00",
    fin: "11:00",
    duree: 2,
    pause: 0,
    montant: 0,
  } as unknown as Mission;
}

// Numéros de semaine ISO pour les dates de référence
// 2026-01-05 (lun) → S2, 2026-01-12 (lun) → S3, 2026-01-19 (lun) → S4
const W2 = getWeekNumber(new Date("2026-01-05")); // 2
const W3 = getWeekNumber(new Date("2026-01-12")); // 3
const W4 = getWeekNumber(new Date("2026-01-19")); // 4

// ─── 1. État initial ──────────────────────────────────────────────────────────

describe("useBilanPeriod — état initial", () => {
  it("bilanPeriodType vaut 'semaine'", () => {
    const params = { missions: [] };
    const { result } = renderHook(() => useBilanPeriod(params));
    expect(result.current.bilanPeriodType).toBe("semaine");
  });

  it("bilanPeriodValue est vide", () => {
    const params = { missions: [] };
    const { result } = renderHook(() => useBilanPeriod(params));
    expect(result.current.bilanPeriodValue).toBe("");
  });

  it("availablePeriods est vide", () => {
    const params = { missions: [] };
    const { result } = renderHook(() => useBilanPeriod(params));
    expect(result.current.availablePeriods).toEqual([]);
  });
});

// ─── 2. calculerPeriodesDisponibles — mode SEMAINE ────────────────────────────

describe("calculerPeriodesDisponibles — mode SEMAINE", () => {
  it("missions vides → availablePeriods reste [] et bilanPeriodValue reste ''", () => {
    const params = { missions: [] };
    const { result } = renderHook(() => useBilanPeriod(params));

    act(() => { result.current.calculerPeriodesDisponibles(); });

    expect(result.current.availablePeriods).toEqual([]);
    expect(result.current.bilanPeriodValue).toBe("");
  });

  it("extrait les numéros de semaine ISO et les trie décroissant", () => {
    const params = {
      missions: [
        makeMission("2026-01-05"), // S2
        makeMission("2026-01-12"), // S3
        makeMission("2026-01-19"), // S4
      ],
    };
    const { result } = renderHook(() => useBilanPeriod(params));

    act(() => { result.current.calculerPeriodesDisponibles(); });

    expect(result.current.availablePeriods).toEqual([String(W4), String(W3), String(W2)]);
    // bilanPeriodValue = first period (most recent) as string
    expect(result.current.bilanPeriodValue).toBe(String(W4));
  });

  it("déduplique les semaines — deux missions de la même semaine comptent une fois", () => {
    const params = {
      missions: [
        makeMission("2026-01-05"), // S2 lundi
        makeMission("2026-01-07"), // S2 mercredi — même semaine
      ],
    };
    const { result } = renderHook(() => useBilanPeriod(params));

    act(() => { result.current.calculerPeriodesDisponibles(); });

    expect(result.current.availablePeriods).toHaveLength(1);
    expect(result.current.availablePeriods[0]).toBe(String(W2));
  });

  it("ignore les missions dont date_mission ET date_iso sont falsy", () => {
    const mNull = { ...makeMission("2026-01-05"), date_mission: null, date_iso: null } as unknown as Mission;
    const params = { missions: [mNull] };
    const { result } = renderHook(() => useBilanPeriod(params));

    act(() => { result.current.calculerPeriodesDisponibles(); });

    expect(result.current.availablePeriods).toEqual([]);
  });

  it("utilise date_iso si date_mission est absent", () => {
    const m = { ...makeMission("2026-01-05"), date_mission: undefined } as unknown as Mission;
    const params = { missions: [m] };
    const { result } = renderHook(() => useBilanPeriod(params));

    act(() => { result.current.calculerPeriodesDisponibles(); });

    expect(result.current.availablePeriods).toEqual([String(W2)]);
  });
});

// ─── 3. calculerPeriodesDisponibles — mode MOIS ───────────────────────────────

describe("calculerPeriodesDisponibles — mode MOIS", () => {
  it("extrait les mois YYYY-MM et les trie décroissant", () => {
    const params = {
      missions: [
        makeMission("2026-01-10"),
        makeMission("2026-03-15"),
        makeMission("2026-02-20"),
      ],
    };
    const { result } = renderHook(() => useBilanPeriod(params));

    act(() => { result.current.setBilanPeriodType("mois"); });
    act(() => { result.current.calculerPeriodesDisponibles(); });

    expect(result.current.availablePeriods).toEqual(["2026-03", "2026-02", "2026-01"]);
    expect(result.current.bilanPeriodValue).toBe("2026-03");
  });

  it("déduplique les mois — deux missions du même mois comptent une fois", () => {
    const params = {
      missions: [makeMission("2026-01-10"), makeMission("2026-01-25")],
    };
    const { result } = renderHook(() => useBilanPeriod(params));

    act(() => { result.current.setBilanPeriodType("mois"); });
    act(() => { result.current.calculerPeriodesDisponibles(); });

    expect(result.current.availablePeriods).toHaveLength(1);
    expect(result.current.availablePeriods[0]).toBe("2026-01");
  });
});

// ─── 4. calculerPeriodesDisponibles — mode ANNEE ─────────────────────────────

describe("calculerPeriodesDisponibles — mode ANNEE", () => {
  it("extrait les années et les trie décroissant", () => {
    const params = {
      missions: [
        makeMission("2024-06-01"),
        makeMission("2026-03-01"),
        makeMission("2025-11-01"),
      ],
    };
    const { result } = renderHook(() => useBilanPeriod(params));

    act(() => { result.current.setBilanPeriodType("annee"); });
    act(() => { result.current.calculerPeriodesDisponibles(); });

    expect(result.current.availablePeriods).toEqual(["2026", "2025", "2024"]);
    expect(result.current.bilanPeriodValue).toBe("2026");
  });
});

// ─── 5. formatCurrentPeriodLabel ─────────────────────────────────────────────

describe("formatCurrentPeriodLabel", () => {
  it("mode SEMAINE → 'Semaine X'", () => {
    const params = { missions: [] };
    const { result } = renderHook(() => useBilanPeriod(params));
    // bilanPeriodType démarre à "semaine"
    expect(result.current.formatCurrentPeriodLabel(4)).toBe("Semaine 4");
  });

  it("mode MOIS → label français en majuscules", () => {
    const params = { missions: [] };
    const { result } = renderHook(() => useBilanPeriod(params));

    act(() => { result.current.setBilanPeriodType("mois"); });

    const label = result.current.formatCurrentPeriodLabel("2026-01");
    expect(label).toMatch(/JANVIER/i);
    expect(label).toMatch(/2026/);
  });

  it("mode ANNEE → retourne la valeur brute", () => {
    const params = { missions: [] };
    const { result } = renderHook(() => useBilanPeriod(params));

    act(() => { result.current.setBilanPeriodType("annee"); });

    expect(result.current.formatCurrentPeriodLabel("2026")).toBe("2026");
  });

  it("valeur vide → chaîne vide", () => {
    const params = { missions: [] };
    const { result } = renderHook(() => useBilanPeriod(params));
    expect(result.current.formatCurrentPeriodLabel("")).toBe("");
  });
});

// ─── 6. Navigation (gotoPreviousWeek / gotoNextWeek / has*) — mode SEMAINE ──────
//
// Après le fix (bug #navigation-semaine), les numéros de semaine sont stockés en
// string → indexOf(bilanPeriodValue) fonctionne maintenant en mode SEMAINE.
// availablePeriods après calculer = [String(W4), String(W3), String(W2)] (trié déc.)

describe("Navigation — gotoPreviousWeek / gotoNextWeek (mode SEMAINE)", () => {
  function setupSemaine() {
    const params = {
      missions: [
        makeMission("2026-01-05"), // S2
        makeMission("2026-01-12"), // S3
        makeMission("2026-01-19"), // S4
      ],
    };
    const hook = renderHook(() => useBilanPeriod(params));
    // bilanPeriodType est déjà "semaine" par défaut
    act(() => { hook.result.current.calculerPeriodesDisponibles(); });
    // bilanPeriodValue = String(W4) (la plus récente)
    return hook;
  }

  it("au plus récent : hasPreviousWeek=true, hasNextWeek=false", () => {
    const { result } = setupSemaine();
    expect(result.current.bilanPeriodValue).toBe(String(W4));
    expect(result.current.hasPreviousWeek).toBe(true);
    expect(result.current.hasNextWeek).toBe(false);
  });

  it("gotoPreviousWeek déplace vers la semaine antérieure", () => {
    const { result } = setupSemaine();

    act(() => { result.current.gotoPreviousWeek(); });

    expect(result.current.bilanPeriodValue).toBe(String(W3));
  });

  it("gotoNextWeek revient vers la semaine plus récente", () => {
    const { result } = setupSemaine();

    act(() => { result.current.gotoPreviousWeek(); }); // → W3
    act(() => { result.current.gotoNextWeek(); });      // → W4

    expect(result.current.bilanPeriodValue).toBe(String(W4));
  });

  it("au plus ancien : hasPreviousWeek=false, hasNextWeek=true", () => {
    const { result } = setupSemaine();

    act(() => { result.current.gotoPreviousWeek(); }); // → W3
    act(() => { result.current.gotoPreviousWeek(); }); // → W2

    expect(result.current.bilanPeriodValue).toBe(String(W2));
    expect(result.current.hasPreviousWeek).toBe(false);
    expect(result.current.hasNextWeek).toBe(true);
  });

  it("gotoPreviousWeek ne change pas l'état si déjà au plus ancien", () => {
    const { result } = setupSemaine();

    act(() => { result.current.gotoPreviousWeek(); }); // → W3
    act(() => { result.current.gotoPreviousWeek(); }); // → W2
    act(() => { result.current.gotoPreviousWeek(); }); // tentative — doit rester W2

    expect(result.current.bilanPeriodValue).toBe(String(W2));
  });
});

// ─── 7. Navigation (gotoPreviousWeek / gotoNextWeek / has*) — mode MOIS ───────
//
// availablePeriods après calculer = ["2026-03", "2026-02", "2026-01"] (trié déc.)
// "précédent" = plus ancien  = index+1
// "suivant"   = plus récent  = index-1

describe("Navigation — gotoPreviousWeek / gotoNextWeek (mode MOIS)", () => {
  function setupMois() {
    const params = {
      missions: [
        makeMission("2026-01-01"),
        makeMission("2026-02-01"),
        makeMission("2026-03-01"),
      ],
    };
    const hook = renderHook(() => useBilanPeriod(params));
    act(() => { hook.result.current.setBilanPeriodType("mois"); });
    act(() => { hook.result.current.calculerPeriodesDisponibles(); });
    // bilanPeriodValue = "2026-03" (le plus récent)
    return hook;
  }

  it("au plus récent : hasPreviousWeek=true, hasNextWeek=false", () => {
    const { result } = setupMois();
    expect(result.current.bilanPeriodValue).toBe("2026-03");
    expect(result.current.hasPreviousWeek).toBe(true);
    expect(result.current.hasNextWeek).toBe(false);
  });

  it("gotoPreviousWeek déplace vers la période antérieure", () => {
    const { result } = setupMois();

    act(() => { result.current.gotoPreviousWeek(); });

    expect(result.current.bilanPeriodValue).toBe("2026-02");
  });

  it("au milieu : hasPreviousWeek=true, hasNextWeek=true", () => {
    const { result } = setupMois();

    act(() => { result.current.gotoPreviousWeek(); }); // → 2026-02

    expect(result.current.hasPreviousWeek).toBe(true);
    expect(result.current.hasNextWeek).toBe(true);
  });

  it("gotoNextWeek revient vers la période plus récente", () => {
    const { result } = setupMois();

    act(() => { result.current.gotoPreviousWeek(); }); // → 2026-02
    act(() => { result.current.gotoNextWeek(); });      // → 2026-03

    expect(result.current.bilanPeriodValue).toBe("2026-03");
  });

  it("au plus ancien : hasPreviousWeek=false, hasNextWeek=true", () => {
    const { result } = setupMois();

    act(() => { result.current.gotoPreviousWeek(); }); // → 2026-02
    act(() => { result.current.gotoPreviousWeek(); }); // → 2026-01

    expect(result.current.bilanPeriodValue).toBe("2026-01");
    expect(result.current.hasPreviousWeek).toBe(false);
    expect(result.current.hasNextWeek).toBe(true);
  });

  it("gotoPreviousWeek ne change pas l'état si déjà au plus ancien", () => {
    const { result } = setupMois();

    act(() => { result.current.gotoPreviousWeek(); }); // → 2026-02
    act(() => { result.current.gotoPreviousWeek(); }); // → 2026-01
    act(() => { result.current.gotoPreviousWeek(); }); // tentative — doit rester 2026-01

    expect(result.current.bilanPeriodValue).toBe("2026-01");
  });
});

// ─── 8. handleWeekChange ──────────────────────────────────────────────────────

describe("handleWeekChange", () => {
  it("met à jour bilanPeriodValue directement", () => {
    const params = { missions: [] };
    const { result } = renderHook(() => useBilanPeriod(params));

    act(() => { result.current.handleWeekChange("2026-05"); });

    expect(result.current.bilanPeriodValue).toBe("2026-05");
  });
});
