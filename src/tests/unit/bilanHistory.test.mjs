import test from "node:test";
import assert from "node:assert/strict";
import { buildAllocByWeek, normalizeHistoriqueRows, splitHistoriqueRows } from "../../lib/bilanHistory.ts";

test("buildAllocByWeek agrège les montants par semaine", () => {
  const out = buildAllocByWeek([
    { periode_index: 10, amount: "50" },
    { periode_index: 10, amount: 25 },
    { periode_index: 11, amount: 40 },
  ]);
  assert.equal(out[10], 75);
  assert.equal(out[11], 40);
});

test("normalizeHistoriqueRows recalcul reste/paye pour lignes non payées", () => {
  const rows = [
    { periode_index: 12, patron_id: "p1", paye: false, ca_brut_periode: 200, periode_value: "12" },
    { periode_index: 11, patron_id: "p1", paye: true, ca_brut_periode: 100, periode_value: "11" },
  ];
  const alloc = { 12: 50 };
  const normalized = normalizeHistoriqueRows(rows, alloc, () => "Patron A");
  assert.equal(normalized[0].reste_a_percevoir, 150);
  assert.equal(normalized[0].paye, false);
  assert.equal(normalized[1].reste_a_percevoir, 0);
  assert.equal(normalized[1].paye, true);
});

test("splitHistoriqueRows sépare impayés et payés", () => {
  const rows = [
    { periode_value: "12", paye: false },
    { periode_value: "10", paye: true },
    { periode_value: "11", paye: false },
  ];
  const { impayes, payes, all } = splitHistoriqueRows(rows);
  assert.equal(all.length, 3);
  assert.equal(impayes.length, 2);
  assert.equal(payes.length, 1);
  assert.equal(impayes[0].periode_value, "12");
});
