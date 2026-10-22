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

// T20.7.1: Acompte unique couvre plusieurs semaines → toutes paye = true
test("T20.7.1: acompte unique couvre plusieurs semaines", () => {
  const acomptes = [{ date_acompte: "2026-01-01", montant: 500, patron_id: "p1" }];
  const missions = [
    { date_iso: "2026-01-05", montant: 150, patron_id: "p1" }, // S1
    { date_iso: "2026-01-12", montant: 200, patron_id: "p1" }, // S2
    { date_iso: "2026-01-19", montant: 100, patron_id: "p1" }, // S3
  ];

  const res = calculerAcomptesBilan(acomptes, missions, [], "2026-01-05", "2026-01-19", "p1");
  assert.equal(res.solde_avant, 500);
  assert.equal(res.acomptes_verses, 0);
  assert.equal(res.acomptes_consommes, 450); // 150+200+100
  assert.equal(res.solde_apres, 50);
});

// T20.7.3: Acompte partiel → semaine pas payée, reste > 0
test("T20.7.3: acompte partiel → semaine pas payée, reste > 0", () => {
  const acomptes = [{ date_acompte: "2026-01-01", montant: 100, patron_id: "p1" }];
  const missions = [{ date_iso: "2026-01-10", montant: 200, patron_id: "p1" }];

  const res = calculerAcomptesBilan(acomptes, missions, [], "2026-01-08", "2026-01-14", "p1");
  assert.equal(res.solde_avant, 100);
  assert.equal(res.acomptes_verses, 0);
  assert.equal(res.acomptes_consommes, 100); // partiel
  assert.equal(res.solde_apres, 0);
  // reste_a_percevoir = 200 - 100 = 100 (calculé par l'appelant)
});

// T20.7.4: getSoldeAvant exclut dateRef (strict <)
test("T20.7.4: calculerSoldeAcomptesAvant exclut strictement dateRef", () => {
  const acomptes = [{ date_acompte: "2026-01-20", montant: 200, patron_id: "p1" }]; // jour J
  const missions = [];

  const solde = calculerSoldeAcomptesAvant("2026-01-20", acomptes, missions, []);
  assert.equal(solde, 0); // acompte jour J NON compté
});

// T20.7.5: solde_avant + acomptes_verses >= acomptes_consommes
test("T20.7.5: cohérence solde_avant + acomptes_verses >= acomptes_consommes", () => {
  const acomptes = [
    { date_acompte: "2026-01-01", montant: 100, patron_id: "p1" },
    { date_acompte: "2026-01-10", montant: 150, patron_id: "p1" },
  ];
  const missions = [{ date_iso: "2026-01-12", montant: 200, patron_id: "p1" }];

  const res = calculerAcomptesBilan(acomptes, missions, [], "2026-01-10", "2026-01-16", "p1");
  const dispo = res.solde_avant + res.acomptes_verses;
  assert.ok(dispo >= res.acomptes_consommes, `dispo (${dispo}) >= consommes (${res.acomptes_consommes})`);
});
