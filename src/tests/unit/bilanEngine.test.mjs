import test from "node:test";
import assert from "node:assert/strict";
import {
  computeStatutPaye,
  computeImpayePrecedent,
  normalizeBilanForWrite,
} from "../../lib/bilanEngine.js";

test("computeStatutPaye applique la règle OR sur paye/reste", () => {
  assert.equal(computeStatutPaye(true, 50), true);
  assert.equal(computeStatutPaye(false, 0), true);
  assert.equal(computeStatutPaye(false, 0.01), true);
  assert.equal(computeStatutPaye(false, 0.02), false);
});

test("computeImpayePrecedent somme les restes positifs", () => {
  const rows = [
    { reste_a_percevoir: 100 },
    { reste_a_percevoir: "49.5" },
    { reste_a_percevoir: -10 },
    { reste_a_percevoir: null },
  ];
  assert.ok(Math.abs(computeImpayePrecedent(rows) - 149.5) < 1e-9);
});

test("normalizeBilanForWrite normalise paye/date/reste", () => {
  const row = normalizeBilanForWrite({
    ca_brut_periode: 200,
    acompte_consomme: 50,
    reste_a_percevoir: 150,
    paye: false,
  });

  assert.equal(row.paye, false);
  assert.equal(row.reste_a_percevoir, 150);
  assert.equal(row.date_paiement, null);

  const paid = normalizeBilanForWrite({ reste_a_percevoir: 0, paye: false });
  assert.equal(paid.paye, true);
  assert.equal(paid.reste_a_percevoir, 0);
  assert.equal(typeof paid.date_paiement, "string");
});
