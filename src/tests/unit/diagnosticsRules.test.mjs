import test from "node:test";
import assert from "node:assert/strict";
import {
  getDiagnosticStatus,
  getStaticAnomalies,
  getDiagDataAnomalies,
  getBilanCardStatus,
  getAcompteCardStatus,
  getKmCardStatus,
  isoWeekStart,
  isoWeekEnd,
} from "../../lib/diagnosticsRules.js";

test("getDiagnosticStatus retourne critical si KM activé sans domicile", () => {
  const status = getDiagnosticStatus({
    kmEnabled: true,
    domLat: null,
    domLng: null,
    lieuxSansCoords: [],
    lieuxSuspects: [],
    nbSansFraisKm: 0,
  });
  assert.equal(status, "critical");
});

test("getDiagnosticStatus retourne warning en cas de mission sans frais km", () => {
  const status = getDiagnosticStatus({
    kmEnabled: true,
    domLat: 48.8,
    domLng: 2.3,
    lieuxSansCoords: [],
    lieuxSuspects: [],
    nbSansFraisKm: 1,
  });
  assert.equal(status, "warning");
});

test("getStaticAnomalies signale un niveau critique dès 3 lieux sans coordonnées", () => {
  const anomalies = getStaticAnomalies({
    kmEnabled: false,
    domLat: null,
    domLng: null,
    lieuxSansCoords: [{}, {}, {}],
    lieuxSuspects: [],
    nbSansFraisKm: 0,
  });

  assert.equal(anomalies[0].severity, "critical");
});

test("getDiagDataAnomalies détecte un acompte sur-alloué", () => {
  const anomalies = getDiagDataAnomalies({
    bilan: null,
    impayePrecedent: 0,
    acomptes: [{ id: "ac1", montant: 100 }],
    allocations: [{ acompte_id: "ac1", amount: 120 }],
  }, 12);

  assert.ok(anomalies.some((a) => a.severity === "critical"));
});

test("isoWeekStart/isoWeekEnd renvoient une semaine de 7 jours", () => {
  const start = new Date(isoWeekStart(10, 2026));
  const end = new Date(isoWeekEnd(10, 2026));
  const diffDays = Math.round((end - start) / (1000 * 60 * 60 * 24));
  assert.equal(diffDays, 6);
});

test("getBilanCardStatus retourne critical en cas d'erreur bilan", () => {
  const status = getBilanCardStatus({
    queryErrors: ["Bilan: timeout"],
    bilan: null,
    impayePrecedent: 0,
  });
  assert.equal(status, "critical");
});

test("getAcompteCardStatus retourne warning pour acompte sans allocation", () => {
  const status = getAcompteCardStatus({
    queryErrors: [],
    acomptes: [{ id: "ac1", montant: 100 }],
    allocations: [],
  });
  assert.equal(status, "warning");
});

test("getKmCardStatus retourne warning sans frais KM", () => {
  const status = getKmCardStatus({
    queryErrors: [],
    fraisKm: [],
  });
  assert.equal(status, "warning");
});
