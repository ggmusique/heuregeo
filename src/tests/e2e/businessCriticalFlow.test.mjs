import test from "node:test";
import assert from "node:assert/strict";
import { calculerDuree } from "../../utils/calculators.ts";
import { getWeekNumber, getWeekStartDate } from "../../utils/dateUtils.ts";
import { normalizeBilanForWrite } from "../../lib/bilanEngine.ts";

test("chaîne métier minimale: mission -> semaine -> bilan", () => {
  const duree = calculerDuree("08:00", "17:00", 30);
  assert.equal(duree, 8.5);

  const week = getWeekNumber(new Date("2026-04-09T09:00:00Z"));
  assert.ok(week > 0);

  const weekStart = getWeekStartDate(week, 2026);
  assert.match(weekStart, /^2026-\d{2}-\d{2}$/);

  const row = normalizeBilanForWrite({
    ca_brut_periode: 297.5,
    acompte_consomme: 120,
    reste_a_percevoir: 177.5,
    paye: false,
  });

  assert.equal(row.paye, false);
  assert.ok(Math.abs(row.reste_a_percevoir - 177.5) < 1e-9);
  assert.equal(row.date_paiement, null);
});
