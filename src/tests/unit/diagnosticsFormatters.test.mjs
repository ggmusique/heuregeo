import test from "node:test";
import assert from "node:assert/strict";
import {
  getHumanDiagnosticSummary,
  buildDiagnosticClipboardText,
  formatAcompteAllocationSummary,
  formatBilanSummary,
} from "../../lib/diagnosticsFormatters.js";

test("formatBilanSummary gère bilan absent", () => {
  assert.equal(formatBilanSummary(null, 12, 0), "Aucun bilan enregistré pour S12.");
});

test("formatAcompteAllocationSummary signale le sur-alloué", () => {
  const text = formatAcompteAllocationSummary(
    { id: "a1", montant: 100 },
    [{ acompte_id: "a1", periode_index: 12, amount: 130 }]
  );
  assert.match(text, /Sur-alloué/);
});

test("getHumanDiagnosticSummary retourne une synthèse multi-phrases", () => {
  const summary = getHumanDiagnosticSummary({
    bilan: { paye: false, reste_a_percevoir: 75 },
    impayePrecedent: 20,
    acomptes: [],
    allocations: [],
  }, 12);

  assert.ok(summary.length >= 2);
  assert.match(summary[0], /S12/);
});

test("buildDiagnosticClipboardText inclut les sections principales", () => {
  const text = buildDiagnosticClipboardText({
    bilan: { ca_brut_periode: 100, paye: false, reste_a_percevoir: 50 },
    impayePrecedent: 10,
    acomptes: [],
    allocations: [],
    fraisKm: [],
  }, 12, "Patron Test");

  assert.match(text, /Patron : Patron Test/);
  assert.match(text, /Acomptes/);
  assert.match(text, /Allocations/);
  assert.match(text, /Frais KM/);
});
