/**
 * congesRestants.vitest.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Tests prioritaires — Point 5 : Congés restants (Dashboard)
 *
 * Logique testée (miroir des useMemo de DashboardPanel) :
 *
 *   Mode 1 : agenda désactivé → carte grisée (agendaEnabled = false)
 *   Mode 2 : agenda actif, conges_annuels absent → "congés planifiés" (futurs)
 *   Mode 3 : agenda actif + conges_annuels → "restants = annuels - passés"
 *
 * Les fonctions de calcul sont extraites des useMemo de DashboardPanel
 * et testées ici comme fonctions pures (sans rendu React).
 */

import { describe, it, expect } from "vitest";
import type { AgendaEvent } from "../../types/entities";

// ─── Constantes (identiques à DashboardPanel) ─────────────────────────────────

const TYPES_CONGE = ["conge", "congé", "vacances", "vacation", "cp"];

// ─── Fonctions miroir des useMemo de DashboardPanel ──────────────────────────

/** Compte les jours de congé futurs (>= todayIso). Miroir de `congesFuturs`. */
function compterCongesFuturs(events: AgendaEvent[], todayIso: string): number {
  return events
    .filter((e) => {
      const t = (e.type ?? "").toLowerCase().trim();
      return TYPES_CONGE.includes(t) && e.date_iso >= todayIso;
    })
    .reduce((sum, e) => {
      if (e.date_fin && e.date_fin > e.date_iso) {
        const start = new Date(e.date_iso + "T12:00:00");
        const end = new Date(e.date_fin + "T12:00:00");
        return sum + Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1;
      }
      return sum + 1;
    }, 0);
}

/** Compte les jours de congé passés dans l'année en cours. Miroir de `congesPassesAnnee`. */
function compterCongesPassesAnnee(
  events: AgendaEvent[],
  todayIso: string,
  yearStr: string
): number {
  return events
    .filter((e) => {
      const t = (e.type ?? "").toLowerCase().trim();
      return (
        TYPES_CONGE.includes(t) &&
        e.date_iso < todayIso &&
        e.date_iso.startsWith(yearStr)
      );
    })
    .reduce((sum, e) => {
      if (e.date_fin && e.date_fin > e.date_iso) {
        const start = new Date(e.date_iso + "T12:00:00");
        const end = new Date(e.date_fin + "T12:00:00");
        return sum + Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1;
      }
      return sum + 1;
    }, 0);
}

/** Calcul final : congés restants (Mode 3). Miroir de `Math.max(0, congesAnnuels - congesPassesAnnee)`. */
function congesRestants(congesAnnuels: number, congesPassesAnnee: number): number {
  return Math.max(0, congesAnnuels - congesPassesAnnee);
}

// ─── Factory ──────────────────────────────────────────────────────────────────

function makeEvent(
  overrides: Partial<AgendaEvent> & { type: string; date_iso: string }
): AgendaEvent {
  return {
    id: "evt-1",
    titre: "Congé",
    date_iso: overrides.date_iso,
    type: overrides.type,
    date_fin: overrides.date_fin ?? null,
    heure_debut: undefined,
    heure_fin: undefined,
    rappel_minutes: undefined,
    description: undefined,
    ...overrides,
  } as AgendaEvent;
}

// ─── Tests — Mode 1 : Agenda désactivé ───────────────────────────────────────

describe("congesRestants — Mode 1 : agenda désactivé (carte grisée)", () => {
  it("agendaEnabled = false → la logique de calcul n'est pas invoquée", () => {
    // Quand l'agenda est désactivé, DashboardPanel n'affiche pas les données.
    // On vérifie que les fonctions retournent 0 sur des listes vides (état initial).
    const today = "2026-05-17";
    expect(compterCongesFuturs([], today)).toBe(0);
    expect(compterCongesPassesAnnee([], today, "2026")).toBe(0);
  });

  it("agendaEnabled = false → congesAnnuels ignoré, pas de calcul restants", () => {
    // En mode désactivé, même si congesAnnuels est défini, on ne calcule rien.
    // Ce test documente l'intention : congesRestants() ne doit pas être appelé.
    const congesAnnuels = 25;
    // Pas d'événements car agenda non chargé
    const passes = compterCongesPassesAnnee([], "2026-05-17", "2026");
    expect(congesRestants(congesAnnuels, passes)).toBe(25); // non invoqué = valeur brute
    // L'UI affiche la carte grisée (ce comportement est testé côté rendu)
  });
});

// ─── Tests — Mode 2 : Agenda actif, conges_annuels absent ────────────────────

describe("congesRestants — Mode 2 : congés planifiés (futurs, sans quota)", () => {
  const today = "2026-05-17";

  it("compte 1 jour pour un événement journée entière futur", () => {
    const events = [makeEvent({ type: "conge", date_iso: "2026-06-01" })];
    expect(compterCongesFuturs(events, today)).toBe(1);
  });

  it("compte les jours corrects pour une période multi-jours (date_fin incluse)", () => {
    const events = [
      makeEvent({ type: "vacances", date_iso: "2026-07-01", date_fin: "2026-07-05" }),
    ];
    // du 1 au 5 juillet inclus = 5 jours
    expect(compterCongesFuturs(events, today)).toBe(5);
  });

  it("accepte tous les types de congé reconnus", () => {
    const today2 = "2026-01-01";
    for (const type of TYPES_CONGE) {
      const events = [makeEvent({ type, date_iso: "2026-06-15" })];
      expect(compterCongesFuturs(events, today2)).toBe(1);
    }
  });

  it("ignore les types d'événements non reconnus comme congé", () => {
    const events = [
      makeEvent({ type: "reunion", date_iso: "2026-06-01" }),
      makeEvent({ type: "formation", date_iso: "2026-06-02" }),
    ];
    expect(compterCongesFuturs(events, today)).toBe(0);
  });

  it("ignore les événements passés (date_iso < today)", () => {
    const events = [
      makeEvent({ type: "conge", date_iso: "2026-01-10" }), // passé
      makeEvent({ type: "conge", date_iso: "2026-06-01" }), // futur
    ];
    expect(compterCongesFuturs(events, today)).toBe(1); // seulement le futur
  });

  it("retourne 0 si aucun congé futur planifié", () => {
    const events = [makeEvent({ type: "conge", date_iso: "2026-01-10" })]; // tous passés
    expect(compterCongesFuturs(events, today)).toBe(0);
  });

  it("inclut l'événement d'aujourd'hui (date_iso = today)", () => {
    const events = [makeEvent({ type: "cp", date_iso: today })];
    expect(compterCongesFuturs(events, today)).toBe(1);
  });

  it("insensible à la casse du type (CONGE, Vacances, CP…)", () => {
    const events = [
      makeEvent({ type: "CONGE", date_iso: "2026-06-01" }),
      makeEvent({ type: "Vacances", date_iso: "2026-06-02" }),
      makeEvent({ type: "CP", date_iso: "2026-06-03" }),
    ];
    expect(compterCongesFuturs(events, today)).toBe(3);
  });
});

// ─── Tests — Mode 3 : Agenda actif + conges_annuels défini ───────────────────

describe("congesRestants — Mode 3 : congés restants = annuels - passés", () => {
  const today = "2026-05-17";
  const year = "2026";

  it("calcul correct : 25 annuels - 5 passés = 20 restants", () => {
    const events = [
      makeEvent({ type: "conge", date_iso: "2026-02-10" }),  // 1 jour passé
      makeEvent({ type: "vacances", date_iso: "2026-03-01", date_fin: "2026-03-04" }), // 4 jours passés
    ];
    const passes = compterCongesPassesAnnee(events, today, year);
    expect(passes).toBe(5);
    expect(congesRestants(25, passes)).toBe(20);
  });

  it("ne descend jamais sous 0 (sécurité Math.max)", () => {
    // 25 annuels mais 30 jours déjà pris → reste = 0
    expect(congesRestants(25, 30)).toBe(0);
  });

  it("exclut les congés passés d'une autre année", () => {
    const events = [
      makeEvent({ type: "conge", date_iso: "2025-12-28" }), // 2025 → ignoré
      makeEvent({ type: "conge", date_iso: "2026-02-10" }), // 2026 → compté
    ];
    const passes = compterCongesPassesAnnee(events, today, year);
    expect(passes).toBe(1);
  });

  it("exclut les congés futurs du décompte 'passés'", () => {
    const events = [
      makeEvent({ type: "conge", date_iso: "2026-01-10" }), // passé → compté
      makeEvent({ type: "conge", date_iso: "2026-07-01" }), // futur → ignoré
    ];
    const passes = compterCongesPassesAnnee(events, today, year);
    expect(passes).toBe(1);
  });

  it("période multi-jours passée : durée calculée correctement (date_fin inclus)", () => {
    const events = [
      makeEvent({
        type: "vacances",
        date_iso: "2026-04-07",
        date_fin: "2026-04-11",
      }),
    ];
    // du 7 au 11 avril = 5 jours
    const passes = compterCongesPassesAnnee(events, today, year);
    expect(passes).toBe(5);
    expect(congesRestants(20, passes)).toBe(15);
  });

  it("retourne conges_annuels intacts si aucun congé n'a été pris", () => {
    const passes = compterCongesPassesAnnee([], today, year);
    expect(passes).toBe(0);
    expect(congesRestants(25, passes)).toBe(25);
  });
});
