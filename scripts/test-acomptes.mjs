/**
 * Tests for calculerAcomptesBilan (pure function).
 * Run from the project root with: node scripts/test-acomptes.mjs
 */

import { calculerAcomptesBilan, calculerSoldeAcomptesAvant } from "../src/utils/calculators.js";

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log("  ✅ PASS:", message);
    passed++;
  } else {
    console.error("  ❌ FAIL:", message);
    failed++;
  }
}

// ──────────────────────────────────────────────────────────────────────
// Cas 1 : Pas d'acompte → rien n'est consommé, reste = CA brut
// ──────────────────────────────────────────────────────────────────────
console.log("\nCas 1 : Aucun acompte, CA = 200€");
{
  const missions = [{ date_iso: "2025-01-13", montant: 200 }];
  const res = calculerAcomptesBilan([], missions, [], "2025-01-13", "2025-01-19");
  assert(res.solde_avant === 0, "solde_avant = 0");
  assert(res.acomptes_verses === 0, "acomptes_verses = 0");
  assert(res.acomptes_consommes === 0, "acomptes_consommes = 0");
  assert(res.solde_apres === 0, "solde_apres = 0");
  // reste_a_percevoir = CA - consommé = 200 - 0 = 200 (calculé par l'appelant)
}

// ──────────────────────────────────────────────────────────────────────
// Cas 2 : Acompte AVANT la période couvre entièrement le CA
// ──────────────────────────────────────────────────────────────────────
console.log("\nCas 2 : Acompte 300€ reçu avant la période, CA = 200€");
{
  const acomptes = [{ date_acompte: "2025-01-06", montant: 300 }];
  const missions = [{ date_iso: "2025-01-13", montant: 200 }];
  const res = calculerAcomptesBilan(acomptes, missions, [], "2025-01-13", "2025-01-19");
  assert(res.solde_avant === 300, "solde_avant = 300 (aucune mission avant la période)");
  assert(res.acomptes_verses === 0, "acomptes_verses = 0 (acompte reçu avant)");
  assert(res.acomptes_consommes === 200, "acomptes_consommes = 200 (CA couvert)");
  assert(res.solde_apres === 100, "solde_apres = 100 (reste)");
}

// ──────────────────────────────────────────────────────────────────────
// Cas 3 : Acompte PENDANT la période, partiellement consommé
// ──────────────────────────────────────────────────────────────────────
console.log("\nCas 3 : Acompte 100€ reçu pendant la période, CA = 150€");
{
  const acomptes = [{ date_acompte: "2025-01-14", montant: 100 }];
  const missions = [{ date_iso: "2025-01-13", montant: 150 }];
  const res = calculerAcomptesBilan(acomptes, missions, [], "2025-01-13", "2025-01-19");
  assert(res.solde_avant === 0, "solde_avant = 0 (aucun acompte avant)");
  assert(res.acomptes_verses === 100, "acomptes_verses = 100");
  assert(res.acomptes_consommes === 100, "acomptes_consommes = 100 (tout consommé)");
  assert(res.solde_apres === 0, "solde_apres = 0");
  // reste_a_percevoir = 150 - 100 = 50
}

// ──────────────────────────────────────────────────────────────────────
// calculerSoldeAcomptesAvant – vérification du wallet
// ──────────────────────────────────────────────────────────────────────
console.log("\nSolde wallet : Acompte 300€, puis missions 200€ puis 150€ (avant date)");
{
  const acomptes = [{ date_acompte: "2025-01-01", montant: 300 }];
  const missions = [
    { date_iso: "2025-01-02", montant: 200 },
    { date_iso: "2025-01-03", montant: 150 },
  ];
  // Après 300 - 200 = 100, puis 100 - 100 (cap) = 0
  const solde = calculerSoldeAcomptesAvant("2025-01-13", acomptes, missions, []);
  assert(solde === 0, "solde = 0 (acompte épuisé après 2 missions)");
}

// ──────────────────────────────────────────────────────────────────────
console.log(`\nRésultat : ${passed} réussi(s), ${failed} échec(s)`);
if (failed > 0) process.exit(1);
