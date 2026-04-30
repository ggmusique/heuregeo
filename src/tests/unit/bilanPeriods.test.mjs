import test from "node:test";
import assert from "node:assert/strict";
import { PERIOD_TYPES } from "../../constants/bilanPeriods.js";
import { computePeriodeIndex, formatPeriodLabel } from "../../lib/bilanPeriods.js";

test("computePeriodeIndex gère semaine/mois/année", () => {
  assert.equal(computePeriodeIndex(PERIOD_TYPES.SEMAINE, "12"), 12);
  assert.equal(computePeriodeIndex(PERIOD_TYPES.MOIS, "2026-04"), 202604);
  assert.equal(computePeriodeIndex(PERIOD_TYPES.ANNEE, "2026"), 2026);
});

test("formatPeriodLabel retourne un libellé lisible", () => {
  assert.equal(formatPeriodLabel(PERIOD_TYPES.SEMAINE, "9"), "Semaine 9");
  const monthLabel = formatPeriodLabel(PERIOD_TYPES.MOIS, "2026-04");
  assert.ok(monthLabel.includes("2026"));
  assert.equal(formatPeriodLabel(PERIOD_TYPES.ANNEE, "2026"), "2026");
});
