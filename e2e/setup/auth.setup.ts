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
 *   1. Le splash screen disparaît (AuthGate a terminé son délai minimum)
 *   2. Le formulaire de login disparaît → AuthGate a rendu l'app (session OK)
 *   3. L'app-shell est visible → arbre React authentifié monté
 *   4. Token Supabase présent en localStorage (warning si absent)
 */
async function assertAuthenticated(page: import("@playwright/test").Page): Promise<void> {
  // ── Étape 1 : splash screen disparu ──────────────────────────────────────
  // AuthGate impose un délai minimum de 2500ms (minDelayDone) avant de rendre
  // quoi que ce soit d'autre. Timeout 20s pour absorber ce délai + réseau.
  await expect(
    page.locator('[data-testid="app-loading-screen"]'),
    "Le splash screen n'a pas disparu — l'app est bloquée en chargement",
  ).not.toBeVisible({ timeout: 20_000 });

  // ── Étape 2 : login-form disparu → session acceptée ───────────────────────
  // AuthGate rend [login-form] quand !session. Après signInWithPassword réussi,
  // onAuthStateChange met session → AuthGate rend l'app à la place.
  await expect(
    page.locator('[data-testid="login-form"]'),
    "Le formulaire de login n'a pas disparu — la connexion a peut-être échoué",
  ).not.toBeVisible({ timeout: 10_000 });

  // ── Étape 3 : app-shell visible → app authentifiée montée ─────────────────
  // [data-testid="app-shell"] n'existe que dans AppInner (authentifié).
  // Absent sur le login form et le splash screen.
  await expect(
    page.locator('[data-testid="app-shell"]'),
    "L'app-shell n'est pas visible — l'app authentifiée ne s'est pas montée",
  ).toBeVisible({ timeout: 10_000 });

  // ── Étape 4 : token Supabase dans localStorage (warning seulement) ────────
  // Vérifie que storageState() capturera bien une session valide.
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

  // Attendre que le splash screen disparaisse et que le formulaire de login soit prêt
  await expect(
    page.locator('[data-testid="app-loading-screen"]'),
    "Le splash screen n'a pas disparu",
  ).not.toBeVisible({ timeout: 15_000 });
  await expect(
    page.locator('[data-testid="login-form"]'),
    "Le formulaire de login n'est pas apparu",
  ).toBeVisible({ timeout: 10_000 });

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

  await expect(
    page.locator('[data-testid="app-loading-screen"]'),
  ).not.toBeVisible({ timeout: 15_000 });
  await expect(page.locator('[data-testid="login-form"]')).toBeVisible({ timeout: 10_000 });

  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');

  // Même vérification robuste pour userB
  await assertAuthenticated(page);

  await page.context().storageState({ path: path.join(AUTH_DIR, "userB.json") });
  console.log("[setup] ✅ Session userB sauvegardée.");
});
