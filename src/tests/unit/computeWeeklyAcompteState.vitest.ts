/**
 * computeWeeklyAcompteState.vitest.ts
 *
 * Point 1 de l'audit : etat acompte hebdomadaire (chemin SEMAINE non readOnly).
 * Fonction pure de bilanEngine, aucun mock.
 *
 * Regles validees :
 *   - dette totale = impayePrecedent + caBrutPeriode
 *   - acompteConsomme = allocCetteSemaine
 *   - resteCettePeriode = max(0, dette - acompteConsomme)  (plancher 0)
 *   - soldeAvantPeriode = max(0, acomptesCumules - totalAlloueAvant - acomptesDansPeriode)
 *   - soldeApresPeriode = max(0, acomptesCumules - totalAlloueJusqua)
 *   - resteAPercevoir = resteCettePeriode
 *
 * Execution :
 *   npm run test:hooks -- computeWeeklyAcompteState
 */

import { describe, expect, it } from "vitest";
import { computeWeeklyAcompteState } from "../../lib/bilanEngine";

describe("computeWeeklyAcompteState - dette", () => {
  it("dette totale = impayePrecedent + caBrutPeriode (sans acompte)", () => {
    const s = computeWeeklyAcompteState({
      impayePrecedent: 30,
      caBrutPeriode: 100,
      allocCetteSemaine: 0,
    });
    expect(s.acompteConsomme).toBe(0);
    expect(s.resteCettePeriode).toBe(130);
    expect(s.resteAPercevoir).toBe(130);
  });

  it("deduit l'acompte (allocCetteSemaine) de la dette", () => {
    const s = computeWeeklyAcompteState({
      impayePrecedent: 0,
      caBrutPeriode: 100,
      allocCetteSemaine: 40,
    });
    expect(s.acompteConsomme).toBe(40);
    expect(s.resteCettePeriode).toBe(60);
    expect(s.resteAPercevoir).toBe(60);
  });

  it("deduit l'acompte de la dette CUMULEE (impaye + courant)", () => {
    const s = computeWeeklyAcompteState({
      impayePrecedent: 60,
      caBrutPeriode: 40,
      allocCetteSemaine: 30,
    });
    // dette 100 - acompte 30 = 70
    expect(s.resteCettePeriode).toBe(70);
  });

  it("plancher a 0 quand l'acompte depasse la dette (jamais negatif)", () => {
    const s = computeWeeklyAcompteState({
      impayePrecedent: 0,
      caBrutPeriode: 50,
      allocCetteSemaine: 80,
    });
    expect(s.resteCettePeriode).toBe(0);
    expect(s.resteAPercevoir).toBe(0);
    // acompteConsomme reste l'alloc brute (la conso au-dela est geree ailleurs)
    expect(s.acompteConsomme).toBe(80);
  });
});

describe("computeWeeklyAcompteState - soldes", () => {
  it("soldeAvantPeriode = acomptesCumules - totalAlloueAvant - acomptesDansPeriode", () => {
    const s = computeWeeklyAcompteState({
      acomptesCumules: 100,
      totalAlloueAvant: 30,
      acomptesDansPeriode: 20,
    });
    expect(s.soldeAvantPeriode).toBe(50);
  });

  it("soldeAvantPeriode plancher a 0", () => {
    const s = computeWeeklyAcompteState({
      acomptesCumules: 10,
      totalAlloueAvant: 30,
      acomptesDansPeriode: 0,
    });
    expect(s.soldeAvantPeriode).toBe(0);
  });

  it("soldeApresPeriode = acomptesCumules - totalAlloueJusqua", () => {
    const s = computeWeeklyAcompteState({
      acomptesCumules: 100,
      totalAlloueJusqua: 70,
    });
    expect(s.soldeApresPeriode).toBe(30);
  });

  it("soldeApresPeriode plancher a 0", () => {
    const s = computeWeeklyAcompteState({
      acomptesCumules: 50,
      totalAlloueJusqua: 70,
    });
    expect(s.soldeApresPeriode).toBe(0);
  });
});

describe("computeWeeklyAcompteState - robustesse des entrees", () => {
  it("parse les valeurs fournies en chaine (parseFloat)", () => {
    const s = computeWeeklyAcompteState({
      impayePrecedent: "30",
      caBrutPeriode: "100",
      allocCetteSemaine: "40",
    });
    expect(s.resteCettePeriode).toBe(90);
    expect(s.acompteConsomme).toBe(40);
  });

  it("sans argument : tout a 0", () => {
    const s = computeWeeklyAcompteState();
    expect(s.acompteConsomme).toBe(0);
    expect(s.soldeAvantPeriode).toBe(0);
    expect(s.soldeApresPeriode).toBe(0);
    expect(s.resteCettePeriode).toBe(0);
    expect(s.resteAPercevoir).toBe(0);
  });
});
