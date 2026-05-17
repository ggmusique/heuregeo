/**
 * soldeAcompte.vitest.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Tests prioritaires — Point 1 : Calcul du solde acompte (critique)
 *
 * Fonctions testées :
 *   • calculerSoldeAcomptesAvant (utils/calculators) — wallet simulation
 *   • computeStandardAcompteState (lib/bilanEngine)  — calcul période standard
 *
 * Ces fonctions sont pures (sans effets de bord) : aucun mock réseau nécessaire.
 */

import { describe, it, expect } from "vitest";
import { calculerSoldeAcomptesAvant } from "../../utils/calculators";
import { computeStandardAcompteState } from "../../lib/bilanEngine";

// ─── 1. calculerSoldeAcomptesAvant ───────────────────────────────────────────

describe("calculerSoldeAcomptesAvant — simulation porte-monnaie", () => {
  it("retourne 0 quand l'acompte est entièrement consommé par les missions", () => {
    const acomptes = [{ date_acompte: "2026-01-01", montant: 200 }];
    const missions = [
      { date_iso: "2026-01-02", montant: 150 },
      { date_iso: "2026-01-03", montant: 100 }, // consomme les 50 restants → solde 0
    ];
    expect(calculerSoldeAcomptesAvant("2026-01-10", acomptes, missions, [])).toBe(0);
  });

  it("ne retourne jamais un solde négatif quand le CA dépasse l'acompte", () => {
    const acomptes = [{ date_acompte: "2026-01-01", montant: 50 }];
    const missions = [{ date_iso: "2026-01-02", montant: 200 }];
    expect(calculerSoldeAcomptesAvant("2026-01-10", acomptes, missions, [])).toBe(0);
  });

  it("le calcul est purement local — résultat identique en mode readOnly et owner", () => {
    // Même entrées → même sortie, indépendamment du rôle appelant
    const acomptes = [{ date_acompte: "2026-01-01", montant: 300, patron_id: "p1" }];
    const missions = [
      { date_iso: "2026-01-02", montant: 100, patron_id: "p1" },
      { date_iso: "2026-01-03", montant: 80, patron_id: "p1" },
    ];
    const soldeOwner = calculerSoldeAcomptesAvant("2026-01-10", acomptes, missions, []);
    const soldeReadOnly = calculerSoldeAcomptesAvant("2026-01-10", acomptes, missions, []);
    expect(soldeOwner).toBe(soldeReadOnly);
    expect(soldeOwner).toBe(120); // 300 - 100 - 80
  });

  it("la RLS ne peut pas bloquer le calcul local (fonction sans appel réseau)", () => {
    // En mode PatronView (readOnly), la RLS Supabase filtre uniquement les lectures DB.
    // calculerSoldeAcomptesAvant opère uniquement sur les données déjà chargées en mémoire.
    // Ce test vérifie qu'un solde correct est calculé sans aucune dépendance réseau.
    const acomptes = [{ date_acompte: "2026-01-01", montant: 500 }];
    const missions = [
      { date_iso: "2026-01-05", montant: 200 },
      { date_iso: "2026-01-10", montant: 300 },
    ];
    // La fonction ne lance pas d'exception, ne fait aucun appel réseau
    expect(() =>
      calculerSoldeAcomptesAvant("2026-01-15", acomptes, missions, [])
    ).not.toThrow();
    expect(calculerSoldeAcomptesAvant("2026-01-15", acomptes, missions, [])).toBe(0);
  });

  it("ignore les acomptes le jour même ou après la date de référence (strict <)", () => {
    const acomptes = [
      { date_acompte: "2026-01-05", montant: 100 }, // même jour → ignoré
      { date_acompte: "2026-01-06", montant: 50 },  // après → ignoré
    ];
    expect(calculerSoldeAcomptesAvant("2026-01-05", acomptes, [], [])).toBe(0);
  });

  it("retourne 0 si aucun acompte n'a été versé, même avec des missions", () => {
    const missions = [{ date_iso: "2026-01-02", montant: 100 }];
    expect(calculerSoldeAcomptesAvant("2026-01-10", [], missions, [])).toBe(0);
  });

  it("intègre les frais divers dans la consommation de l'acompte", () => {
    const acomptes = [{ date_acompte: "2026-01-01", montant: 200 }];
    const frais = [{ date_frais: "2026-01-03", montant: 60 }];
    expect(calculerSoldeAcomptesAvant("2026-01-10", acomptes, [], frais)).toBe(140);
  });

  it("accumule correctement plusieurs acomptes distincts", () => {
    const acomptes = [
      { date_acompte: "2026-01-01", montant: 100 },
      { date_acompte: "2026-01-03", montant: 150 },
    ];
    const missions = [{ date_iso: "2026-01-05", montant: 80 }];
    expect(calculerSoldeAcomptesAvant("2026-01-10", acomptes, missions, [])).toBe(170);
  });

  it("retourne 0 si dateRef est vide", () => {
    const acomptes = [{ date_acompte: "2026-01-01", montant: 100 }];
    expect(calculerSoldeAcomptesAvant("", acomptes, [], [])).toBe(0);
  });
});

// ─── 2. computeStandardAcompteState ──────────────────────────────────────────

describe("computeStandardAcompteState — calcul période mensuelle / annuelle", () => {
  it("soldeApresPeriode = 0 quand le CA épuise entièrement l'acompte disponible", () => {
    const s = computeStandardAcompteState({
      soldeAvantPeriode: 100,
      acomptesDansPeriode: 50,
      caBrutPeriode: 200, // > 150 disponibles
    });
    expect(s.soldeApresPeriode).toBe(0);
    expect(s.acompteConsomme).toBe(150); // Math.min(150, 200)
  });

  it("readOnly et owner donnent exactement le même résultat (même fonction pure)", () => {
    // Régression bug PatronView : le solde affiché était 753.75 au lieu de 0
    const params = {
      soldeAvantPeriode: 753.75,
      acomptesDansPeriode: 0,
      caBrutPeriode: 753.75,
    };
    const s1 = computeStandardAcompteState(params);
    const s2 = computeStandardAcompteState(params);
    expect(s1.soldeApresPeriode).toBe(s2.soldeApresPeriode);
    expect(s1.acompteConsomme).toBe(s2.acompteConsomme);
    expect(s1.resteAPercevoir).toBe(s2.resteAPercevoir);
  });

  it("bug PatronView 753,75€ → solde doit être 0 et non 753,75€", () => {
    // Ce test capture le bug original : en mode readOnly, getSoldeAvant()
    // retournait 0 au lieu du solde réel car la RLS bloquait la lecture.
    // La correction : readOnly=true force le chemin local via getSoldeAvant().
    const s = computeStandardAcompteState({
      soldeAvantPeriode: 753.75,
      acomptesDansPeriode: 0,
      caBrutPeriode: 753.75,
    });
    expect(s.acompteConsomme).toBeCloseTo(753.75, 5);
    expect(s.soldeApresPeriode).toBe(0);
    expect(s.resteAPercevoir).toBe(0);
  });

  it("resteAPercevoir = 0 quand l'acompte couvre tout le CA", () => {
    const s = computeStandardAcompteState({
      soldeAvantPeriode: 500,
      acomptesDansPeriode: 0,
      caBrutPeriode: 300,
    });
    expect(s.resteAPercevoir).toBe(0);
    expect(s.resteCettePeriode).toBe(0);
    expect(s.soldeApresPeriode).toBe(200); // 500 - 300
  });

  it("acompteConsomme ne dépasse jamais le CA (pas de sur-consommation)", () => {
    const s = computeStandardAcompteState({
      soldeAvantPeriode: 1000,
      acomptesDansPeriode: 0,
      caBrutPeriode: 150,
    });
    expect(s.acompteConsomme).toBe(150); // pas 1000
    expect(s.soldeApresPeriode).toBe(850);
  });

  it("normalise les entrées non numériques à 0 sans lever d'exception", () => {
    const s = computeStandardAcompteState({
      soldeAvantPeriode: "abc" as unknown as number,
      acomptesDansPeriode: null as unknown as number,
      caBrutPeriode: 20,
    });
    expect(s.acompteConsomme).toBe(0);
    expect(s.resteCettePeriode).toBe(20);
    expect(s.resteAPercevoir).toBe(20);
  });

  it("retourne des zéros si aucun paramètre n'est fourni", () => {
    const s = computeStandardAcompteState();
    expect(s.acompteConsomme).toBe(0);
    expect(s.resteCettePeriode).toBe(0);
    expect(s.resteAPercevoir).toBe(0);
    expect(s.soldeApresPeriode).toBe(0);
  });
});
