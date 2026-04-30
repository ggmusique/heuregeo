import test from "node:test";
import assert from "node:assert/strict";
import { calculerAcomptesBilan } from "../../utils/calculators.js";
import { computeConsommeCettePeriode } from "../../lib/bilanEngine.js";
import { PERIOD_TYPES } from "../../constants/bilanPeriods.js";

test("invariant consommation: hebdo et mensuel restent cohérents", () => {
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

  // Période hebdo: la valeur affichée doit être celle réellement versée sur la période.
  const hebdo = computeConsommeCettePeriode({
    bilanPeriodType: PERIOD_TYPES.SEMAINE,
    periodTypes: PERIOD_TYPES,
    acomptesDansPeriodeCalc: 100,
  });
  assert.equal(hebdo, 100);

  // Période mensuelle: on applique la formule delta de solde.
  const mensuel = calculerAcomptesBilan(
    acomptes,
    missions,
    frais,
    "2026-04-01",
    "2026-04-30",
    "p1"
  );

  const consoMensuelle = computeConsommeCettePeriode({
    bilanPeriodType: PERIOD_TYPES.MOIS,
    periodTypes: PERIOD_TYPES,
    soldeAvantPeriode: mensuel.solde_avant,
    acomptesDansPeriode: mensuel.acomptes_verses,
    soldeApresPeriode: mensuel.solde_apres,
  });

  assert.equal(consoMensuelle, mensuel.acomptes_consommes);
});
