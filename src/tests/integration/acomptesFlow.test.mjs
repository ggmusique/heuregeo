import test from "node:test";
import assert from "node:assert/strict";
import {
  calculerAcomptesBilan,
  calculerSoldeAcomptesAvant,
} from "../../utils/calculators.ts";

test("cohérence wallet avant période et consommation période", () => {
  const acomptes = [
    { date_acompte: "2026-04-01", montant: 300, patron_id: "p1" },
    { date_acompte: "2026-04-08", montant: 100, patron_id: "p1" },
  ];

  const missions = [
    { date_iso: "2026-04-03", montant: 120, patron_id: "p1" },
    { date_iso: "2026-04-09", montant: 180, patron_id: "p1" },
  ];

  const frais = [
    { date_frais: "2026-04-04", montant: 50, patron_id: "p1" },
    { date_frais: "2026-04-10", montant: 20, patron_id: "p1" },
  ];

  const soldeAvant = calculerSoldeAcomptesAvant("2026-04-08", acomptes, missions, frais);
  assert.equal(soldeAvant, 130);

  const res = calculerAcomptesBilan(
    acomptes,
    missions,
    frais,
    "2026-04-08",
    "2026-04-14",
    "p1"
  );

  assert.equal(res.solde_avant, 130);
  assert.equal(res.acomptes_verses, 100);
  assert.equal(res.acomptes_consommes, 180);
  assert.equal(res.solde_apres, 50);
});
