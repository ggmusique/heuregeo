import test from "node:test";
import assert from "node:assert/strict";
import { computeRepairDecision } from "../../lib/bilanRepair.js";

test("computeRepairDecision détecte une ligne déjà correcte", () => {
  const bilan = {
    periode_index: 12,
    ca_brut_periode: 200,
    acompte_consomme: 50,
    reste_a_percevoir: 150,
    paye: false,
  };
  const res = computeRepairDecision(bilan, { 12: 50 });
  assert.equal(res.needsFix, false);
  assert.equal(res.payload.reste_a_percevoir, 150);
});

test("computeRepairDecision propose une correction si données incohérentes", () => {
  const bilan = {
    periode_index: 12,
    ca_brut_periode: 200,
    acompte_consomme: 20,
    reste_a_percevoir: 180,
    paye: false,
  };
  const res = computeRepairDecision(bilan, { 12: 50 });
  assert.equal(res.needsFix, true);
  assert.equal(res.payload.acompte_consomme, 50);
  assert.equal(res.payload.reste_a_percevoir, 150);
});
