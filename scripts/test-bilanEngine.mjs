/**
 * Tests for bilanEngine pure functions.
 * Run from the project root with: node scripts/test-bilanEngine.mjs
 */

import {
  computeStatutPaye,
  computeImpayePrecedent,
  normalizeBilanForWrite,
} from "../src/lib/bilanEngine.js";

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

function assertClose(a, b, message, tol = 0.001) {
  assert(Math.abs(a - b) < tol, `${message} (got ${a}, expected ${b})`);
}

// ────────────────────────────────────────────────────────────────────
// computeStatutPaye
// ────────────────────────────────────────────────────────────────────
console.log("\ncomputeStatutPaye");

// paye=true, reste=0 → payé
assert(computeStatutPaye(true, 0) === true, "paye=true, reste=0 → true");

// paye=false, reste=0 → payé (reste est la source de vérité)
assert(computeStatutPaye(false, 0) === true, "paye=false, reste=0 → true (reste source of truth)");

// paye=false, reste <= 0.01 → payé (tolérance centimes)
assert(computeStatutPaye(false, 0.005) === true, "paye=false, reste=0.005 → true (within tolerance)");
assert(computeStatutPaye(false, 0.01) === true, "paye=false, reste=0.01 → true (at tolerance)");

// paye=false, reste > 0.01 → non payé
assert(computeStatutPaye(false, 0.02) === false, "paye=false, reste=0.02 → false");
assert(computeStatutPaye(false, 50) === false, "paye=false, reste=50 → false");
assert(computeStatutPaye(false, 295) === false, "paye=false, reste=295 → false");

// paye=true, reste > 0 (DB incohérente) → payé quand même (OR rule)
assert(computeStatutPaye(true, 50) === true, "paye=true, reste=50 → true (DB inconsistency, OR rule)");

// valeurs invalides
assert(computeStatutPaye(false, null) === true, "paye=false, reste=null → true (null parsed as 0)");
assert(computeStatutPaye(false, undefined) === true, "paye=false, reste=undefined → true");
assert(computeStatutPaye(false, "0") === true, "paye=false, reste='0' string → true");
assert(computeStatutPaye(false, "50.5") === false, "paye=false, reste='50.5' string → false");

// ────────────────────────────────────────────────────────────────────
// computeImpayePrecedent
// ────────────────────────────────────────────────────────────────────
console.log("\ncomputeImpayePrecedent");

// Aucune semaine précédente
assertClose(
  computeImpayePrecedent([]),
  0,
  "tableau vide → 0"
);

// Toutes les semaines payées
assertClose(
  computeImpayePrecedent([
    { reste_a_percevoir: 0, paye: true },
    { reste_a_percevoir: 0, paye: true },
  ]),
  0,
  "toutes payées → 0"
);

// Une semaine impayée à 295€
assertClose(
  computeImpayePrecedent([
    { reste_a_percevoir: 0, paye: true },
    { reste_a_percevoir: 295, paye: false },
  ]),
  295,
  "une impayée 295€ → 295"
);

// Deux semaines impayées
assertClose(
  computeImpayePrecedent([
    { reste_a_percevoir: 100, paye: false },
    { reste_a_percevoir: 200, paye: false },
  ]),
  300,
  "deux impayées 100+200 → 300"
);

// Valeurs string (telles que retournées par Supabase)
assertClose(
  computeImpayePrecedent([
    { reste_a_percevoir: "150.50", paye: false },
    { reste_a_percevoir: "49.50", paye: false },
  ]),
  200,
  "valeurs string '150.50' + '49.50' → 200"
);

// Valeurs null/undefined ignorées
assertClose(
  computeImpayePrecedent([
    { reste_a_percevoir: null },
    { reste_a_percevoir: undefined },
    { reste_a_percevoir: 75 },
  ]),
  75,
  "null/undefined ignorés, 75 → 75"
);

// Valeurs négatives ignorées (ne doivent pas réduire le total)
assertClose(
  computeImpayePrecedent([
    { reste_a_percevoir: -10 },
    { reste_a_percevoir: 100 },
  ]),
  100,
  "négatif ignoré, 100 → 100"
);

// undefined passé (ne doit pas planter)
assertClose(
  computeImpayePrecedent(undefined),
  0,
  "undefined → 0 (pas de crash)"
);

// ────────────────────────────────────────────────────────────────────
// normalizeBilanForWrite
// ────────────────────────────────────────────────────────────────────
console.log("\nnormalizeBilanForWrite");

// Cas normal non payé
{
  const r = normalizeBilanForWrite({ ca_brut_periode: 200, acompte_consomme: 50, reste_a_percevoir: 150, paye: false });
  assert(r.paye === false, "reste=150 → paye=false");
  assertClose(r.reste_a_percevoir, 150, "reste_a_percevoir conservé");
  assert(r.date_paiement === null, "date_paiement=null si non payé");
}

// Cas payé via flag
{
  const r = normalizeBilanForWrite({ ca_brut_periode: 200, acompte_consomme: 200, reste_a_percevoir: 0, paye: true });
  assert(r.paye === true, "paye=true → reste invariant");
  assertClose(r.reste_a_percevoir, 0, "reste_a_percevoir=0");
  assert(r.date_paiement !== null, "date_paiement défini");
}

// Cas payé via reste=0 (même si paye=false en entrée)
{
  const r = normalizeBilanForWrite({ ca_brut_periode: 200, acompte_consomme: 200, reste_a_percevoir: 0, paye: false });
  assert(r.paye === true, "reste=0 + paye=false → normalisé paye=true");
  assert(r.date_paiement !== null, "date_paiement défini malgré paye=false en entrée");
}

// Cas DB incohérente : paye=false mais reste=-5 (ne doit pas être négatif)
{
  const r = normalizeBilanForWrite({ ca_brut_periode: 200, reste_a_percevoir: -5, paye: false });
  assertClose(r.reste_a_percevoir, 0, "reste négatif normalisé à 0");
  assert(r.paye === true, "reste négatif → considéré payé");
}

// date_paiement existante préservée si payé
{
  const d = "2026-01-15T10:00:00.000Z";
  const r = normalizeBilanForWrite({ reste_a_percevoir: 0, paye: true, date_paiement: d });
  assert(r.date_paiement === d, "date_paiement existante préservée");
}

// Appel sans argument (ne doit pas planter)
{
  const r = normalizeBilanForWrite();
  assert(r.paye === true, "sans args → reste=0 → paye=true");
  assertClose(r.ca_brut_periode, 0, "ca_brut_periode=0 par défaut");
}

// ────────────────────────────────────────────────────────────────────
console.log(`\nRésultat : ${passed} réussi(s), ${failed} échec(s)`);
if (failed > 0) process.exit(1);
