import test from "node:test";
import assert from "node:assert/strict";
import { calculerAcomptesBilan } from "../../utils/calculators.ts";
import { computeConsommeCettePeriode, computeWeeklyAcompteState, computeStandardAcompteState } from "../../lib/bilanEngine.ts";
import { PERIOD_TYPES } from "../../constants/bilanPeriods.ts";

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

test("invariant consommation: la conso hebdo est bornée à zéro", () => {
  const consoHebdo = computeConsommeCettePeriode({
    bilanPeriodType: PERIOD_TYPES.SEMAINE,
    periodTypes: PERIOD_TYPES,
    acomptesDansPeriodeCalc: -15,
  });

  assert.equal(consoHebdo, 0);
});

test("invariant consommation: hors hebdo, un delta négatif est borné à zéro", () => {
  const consoMois = computeConsommeCettePeriode({
    bilanPeriodType: PERIOD_TYPES.MOIS,
    periodTypes: PERIOD_TYPES,
    soldeAvantPeriode: "15",
    acomptesDansPeriode: "5",
    soldeApresPeriode: "40",
  });

  assert.equal(consoMois, 0);
});

test("invariant consommation: reste stable si periodTypes est absent", () => {
  const consoSansTypes = computeConsommeCettePeriode({
    bilanPeriodType: "semaine",
    soldeAvantPeriode: 40,
    acomptesDansPeriode: 20,
    soldeApresPeriode: 10,
  });

  assert.equal(consoSansTypes, 50);
});

test("invariant consommation: entrées null/undefined ne cassent pas le calcul", () => {
  const conso = computeConsommeCettePeriode({
    bilanPeriodType: PERIOD_TYPES.MOIS,
    periodTypes: PERIOD_TYPES,
    soldeAvantPeriode: null,
    acomptesDansPeriode: undefined,
    soldeApresPeriode: undefined,
  });

  assert.equal(conso, 0);
});

test("invariant hebdo repository->hook: state acompte cohérent", () => {
  const weekly = computeWeeklyAcompteState({
    allocCetteSemaine: 150,
    totalAlloueJusqua: 250,
    totalAlloueAvant: 100,
    acomptesCumules: 400,
    acomptesDansPeriode: 40,
    impayePrecedent: 80,
    caBrutPeriode: 200,
  });

  assert.equal(weekly.acompteConsomme, 150);
  assert.equal(weekly.soldeAvantPeriode, 260);
  assert.equal(weekly.soldeApresPeriode, 150);
  assert.equal(weekly.resteCettePeriode, 130);
  assert.equal(weekly.resteAPercevoir, 130);
});

test("invariant hebdo limites: sans acomptes, trop d'acomptes et impayé élevé", () => {
  const sansAcomptes = computeWeeklyAcompteState({
    allocCetteSemaine: 0,
    totalAlloueJusqua: 0,
    totalAlloueAvant: 0,
    acomptesCumules: 0,
    acomptesDansPeriode: 0,
    impayePrecedent: 20,
    caBrutPeriode: 180,
  });
  assert.equal(sansAcomptes.acompteConsomme, 0);
  assert.equal(sansAcomptes.soldeAvantPeriode, 0);
  assert.equal(sansAcomptes.soldeApresPeriode, 0);
  assert.equal(sansAcomptes.resteAPercevoir, 200);

  const tropAcomptes = computeWeeklyAcompteState({
    allocCetteSemaine: 40,
    totalAlloueJusqua: 40,
    totalAlloueAvant: 0,
    acomptesCumules: 400,
    acomptesDansPeriode: 200,
    impayePrecedent: 0,
    caBrutPeriode: 50,
  });
  assert.equal(tropAcomptes.soldeAvantPeriode, 200);
  assert.equal(tropAcomptes.soldeApresPeriode, 360);
  assert.equal(tropAcomptes.resteAPercevoir, 10);

  const impayeEleve = computeWeeklyAcompteState({
    allocCetteSemaine: 50,
    totalAlloueJusqua: 100,
    totalAlloueAvant: 60,
    acomptesCumules: 120,
    acomptesDansPeriode: 10,
    impayePrecedent: 500,
    caBrutPeriode: 100,
  });
  assert.equal(impayeEleve.resteAPercevoir, 550);
});

test("invariant non-hebdo helper: équivalent de la formule historique", () => {
  const cases = [
    { soldeAvantPeriode: 130, acomptesDansPeriode: 100, caBrutPeriode: 180 },
    { soldeAvantPeriode: 0, acomptesDansPeriode: 0, caBrutPeriode: 200 },
    { soldeAvantPeriode: "50", acomptesDansPeriode: "25", caBrutPeriode: "30" },
  ];

  for (const c of cases) {
    const legacyAcompteDisponible = (parseFloat(c.soldeAvantPeriode) || 0) + (parseFloat(c.acomptesDansPeriode) || 0);
    const legacyAcompteConsomme = Math.min(legacyAcompteDisponible, parseFloat(c.caBrutPeriode) || 0);
    const legacyReste = (parseFloat(c.caBrutPeriode) || 0) - legacyAcompteConsomme;
    const legacySoldeApres = legacyAcompteDisponible - legacyAcompteConsomme;

    const state = computeStandardAcompteState(c);
    assert.equal(state.acompteConsomme, legacyAcompteConsomme);
    assert.equal(state.resteCettePeriode, legacyReste);
    assert.equal(state.resteAPercevoir, legacyReste);
    assert.equal(state.soldeApresPeriode, legacySoldeApres);
  }
});

test("invariant non-hebdo: consommeCettePeriode cohérent avec standardState", () => {
  const state = computeStandardAcompteState({
    soldeAvantPeriode: 90,
    acomptesDansPeriode: 60,
    caBrutPeriode: 100,
  });

  const consomme = computeConsommeCettePeriode({
    bilanPeriodType: PERIOD_TYPES.MOIS,
    periodTypes: PERIOD_TYPES,
    soldeAvantPeriode: 90,
    acomptesDansPeriode: 60,
    soldeApresPeriode: state.soldeApresPeriode,
  });

  assert.equal(consomme, state.acompteConsomme);
});

test("invariant hebdo: soldes et reste bornés avec entrées négatives", () => {
  const state = computeWeeklyAcompteState({
    allocCetteSemaine: -30,
    totalAlloueJusqua: -20,
    totalAlloueAvant: -10,
    acomptesCumules: -100,
    acomptesDansPeriode: -50,
    impayePrecedent: -200,
    caBrutPeriode: -300,
  });

  assert.equal(state.soldeAvantPeriode, 0);
  assert.equal(state.soldeApresPeriode, 0);
  assert.equal(state.resteCettePeriode, 0);
  assert.equal(state.resteAPercevoir, 0);
});
