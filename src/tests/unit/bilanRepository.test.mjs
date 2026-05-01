import test from "node:test";
import assert from "node:assert/strict";
import { mapWeeklyAcompteMetricsFromRows } from "../../lib/bilanMetrics.js";

test("mapWeeklyAcompteMetricsFromRows agrège correctement les montants", () => {
  const metrics = mapWeeklyAcompteMetricsFromRows({
    allocsCetteSemaine: [{ amount: "10.5" }, { amount: 9.5 }],
    allocsJusqua: [{ amount: 20 }, { amount: "5" }],
    allocsAvant: [{ amount: "12.25" }],
    allocsCreatedInPeriod: [{ amount: "7.5" }, { amount: "2.5" }],
    acomptesCumules: [{ montant: "100" }, { montant: 50 }],
    acomptesPeriode: [{ montant: "30" }, { montant: 5 }],
  });

  assert.equal(metrics.allocCetteSemaine, 20);
  assert.equal(metrics.totalAlloueJusqua, 25);
  assert.equal(metrics.totalAlloueAvant, 12.25);
  assert.equal(metrics.acompteConsommePeriode, 10);
  assert.equal(metrics.acomptesCumules, 150);
  assert.equal(metrics.acomptesDansPeriode, 35);
});

test("mapWeeklyAcompteMetricsFromRows tolère les entrées vides/invalides", () => {
  const metrics = mapWeeklyAcompteMetricsFromRows({
    allocsCetteSemaine: [{ amount: null }, { amount: "x" }],
    acomptesCumules: [{ montant: undefined }],
  });

  assert.equal(metrics.allocCetteSemaine, 0);
  assert.equal(metrics.totalAlloueJusqua, 0);
  assert.equal(metrics.totalAlloueAvant, 0);
  assert.equal(metrics.acompteConsommePeriode, 0);
  assert.equal(metrics.acomptesCumules, 0);
  assert.equal(metrics.acomptesDansPeriode, 0);
});

test("mapWeeklyAcompteMetricsFromRows retourne des zéros par défaut", () => {
  const metrics = mapWeeklyAcompteMetricsFromRows();

  assert.deepEqual(metrics, {
    allocCetteSemaine: 0,
    totalAlloueJusqua: 0,
    totalAlloueAvant: 0,
    acompteConsommePeriode: 0,
    acomptesCumules: 0,
    acomptesDansPeriode: 0,
  });
});
