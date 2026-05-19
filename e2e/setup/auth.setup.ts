// e2e/setup/auth.setup.ts
// ─────────────────────────────────────────────────────────────────────────────
// Création des sessions authentifiées persistantes pour les tests E2E.
//
// Ce fichier est exécuté UNE FOIS avant tous les tests (project "setup").
// Il enregistre l'état du navigateur (cookies, localStorage) dans des fichiers
// JSON réutilisés par les tests suivants → pas de re-login à chaque test.
//
// PRÉREQUIS :
//   Définir dans .env.local :
//   E2E_OWNER_EMAIL=owner@test.heuregeo.com
//   E2E_OWNER_PASSWORD=...
//   E2E_USERB_EMAIL=userb@test.heuregeo.com
//   E2E_USERB_PASSWORD=...
//
// SÉCURITÉ :
//   Ces comptes doivent être des comptes de TEST dédiés, jamais des comptes
//   de production. Ne jamais committer les credentials dans le repo.
//
// POURQUOI PAS `toHaveURL()` :
//   L'application est une SPA React/Vite. L'URL reste `http://localhost:5173/`
//   après connexion. `AuthGate.tsx` gère l'auth via React state (pas de routing
//   URL). L'assertion URL était donc structurellement incorrecte.
//
// SIGNAL FIABLE POST-LOGIN :
//   1. `input[type="email"]` disparaît → AuthGate a rendu l'app (session OK)
//   2. `nav` apparaît → la navigation authentifiée est montée
//   Note : AuthGate a un délai minimum de 2500ms (minDelayDone) avant de
//   rendre l'app → timeout de 20s pour absorber ce délai + latence réseau.
// ─────────────────────────────────────────────────────────────────────────────

import { test as setup, expect } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";

// Utilise process.cwd() au lieu de __dirname (incompatible ESM avec "type": "module")
const AUTH_DIR = path.join(process.cwd(), "e2e", ".auth");

// Crée le répertoire si inexistant
if (!fs.existsSync(AUTH_DIR)) {
  fs.mkdirSync(AUTH_DIR, { recursive: true });
}

/**
 * Vérifie qu'une session authentifiée est active après login.
 *
 * Stratégie robuste (URL-indépendante, compatible SPA React/Supabase) :
 *   1. Le formulaire de login disparaît   → AuthGate a accepté la session
 *   2. La navigation app apparaît         → l'app authentifiée est montée
 *   3. Token Supabase présent en localStorage (warning si absent)
 */
async function assertAuthenticated(page: import("@playwright/test").Page): Promise<void> {
  // ── Étape 1 : disparition du formulaire de login ──────────────────────────
  // AuthGate rend le formulaire quand !session. Quand session est définie
  // (après signInWithPassword réussi), il rend l'app à la place.
  // Le délai minimum de 2500ms (minDelayDone dans AuthGate) est absorbé
  // par le timeout de 20 000ms.
  await expect(
    page.locator('input[type="email"]'),
    "Le formulaire de login n'a pas disparu — la connexion a peut-être échoué ou l'app est trop lente",
  ).not.toBeVisible({ timeout: 20_000 });

  // ── Étape 2 : présence de la navigation authentifiée ─────────────────────
  // `<nav>` n'existe que dans l'app montée (AppNavBar). Absent sur l'écran
  // de login. Sa présence confirme que l'arbre React authentifié est rendu.
  await expect(
    page.locator("nav").first(),
    "La navigation n'est pas visible après connexion — l'app ne s'est pas montée",
  ).toBeVisible({ timeout: 10_000 });

  // ── Étape 3 : token Supabase dans localStorage (warning seulement) ────────
  // Vérifie que storageState() capturera bien une session valide.
  // Supabase stocke le token sous une clé commençant par "sb-".
  const hasSupabaseToken = await page.evaluate(() =>
    Object.keys(localStorage).some((k) => k.startsWith("sb-") && k.includes("auth-token")),
  );
  if (!hasSupabaseToken) {
    console.warn(
      "[setup] ⚠️  Aucun token Supabase trouvé dans localStorage. " +
      "La session sera peut-être invalide pour les tests suivants.",
    );
  }
}

// ── Setup : Owner (utilisateur principal) ─────────────────────────────────────
setup("authenticate owner", async ({ page }) => {
  const email = process.env.E2E_OWNER_EMAIL;
  const password = process.env.E2E_OWNER_PASSWORD;

  if (!email || !password) {
    console.warn("[setup] E2E_OWNER_EMAIL ou E2E_OWNER_PASSWORD non définis → skip auth setup");
    // Créer un fichier vide pour que les projets dépendants ne plantent pas
    fs.writeFileSync(
      path.join(AUTH_DIR, "owner.json"),
      JSON.stringify({ cookies: [], origins: [] }),
    );
    return;
  }

  await page.goto("/");

  // Attendre que le formulaire de login soit prêt
  await expect(
    page.locator('input[type="email"]'),
    "Le formulaire de login n'est pas apparu",
  ).toBeVisible({ timeout: 15_000 });

  // Remplir et soumettre
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');

  // Vérification session robuste (URL-indépendante)
  await assertAuthenticated(page);

  // Sauvegarder la session (cookies + localStorage avec le token Supabase)
  await page.context().storageState({ path: path.join(AUTH_DIR, "owner.json") });
  console.log("[setup] ✅ Session owner sauvegardée.");
});

// ── Setup : User B (second utilisateur pour les tests d'isolation) ────────────
setup("authenticate userB", async ({ page }) => {
  const email = process.env.E2E_USERB_EMAIL;
  const password = process.env.E2E_USERB_PASSWORD;

  if (!email || !password) {
    // Créer un fichier vide pour éviter que Playwright plante
    fs.writeFileSync(
      path.join(AUTH_DIR, "userB.json"),
      JSON.stringify({ cookies: [], origins: [] }),
    );
    console.warn("[setup] E2E_USERB_EMAIL non défini → userB.json vide créé");
    return;
  }

  await page.goto("/");

  await expect(page.locator('input[type="email"]')).toBeVisible({ timeout: 15_000 });

  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');

  // Même vérification robuste pour userB
  await assertAuthenticated(page);

  await page.context().storageState({ path: path.join(AUTH_DIR, "userB.json") });
  console.log("[setup] ✅ Session userB sauvegardée.");
});
