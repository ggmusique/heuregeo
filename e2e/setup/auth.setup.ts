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
// ─────────────────────────────────────────────────────────────────────────────

import { test as setup, expect } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";

const AUTH_DIR = path.join(__dirname, "../.auth");

// Crée le répertoire si inexistant
if (!fs.existsSync(AUTH_DIR)) {
  fs.mkdirSync(AUTH_DIR, { recursive: true });
}

// ── Setup : Owner (utilisateur principal) ─────────────────────────────────────
setup("authenticate owner", async ({ page }) => {
  const email = process.env.E2E_OWNER_EMAIL;
  const password = process.env.E2E_OWNER_PASSWORD;

  if (!email || !password) {
    console.warn("[setup] E2E_OWNER_EMAIL ou E2E_OWNER_PASSWORD non définis → skip auth setup");
    return;
  }

  await page.goto("/");

  // Attendre la page de login
  await page.waitForSelector('[data-testid="login-email"], input[type="email"]', {
    timeout: 10_000,
  });

  await page.fill('[data-testid="login-email"], input[type="email"]', email);
  await page.fill('[data-testid="login-password"], input[type="password"]', password);
  await page.click('[data-testid="login-submit"], button[type="submit"]');

  // Attendre le chargement du dashboard après login
  await expect(page).toHaveURL(/\/(dashboard|missions|bilan)/, { timeout: 15_000 });

  // Sauvegarder la session
  await page.context().storageState({ path: path.join(AUTH_DIR, "owner.json") });
  console.log("[setup] Session owner sauvegardée.");
});

// ── Setup : User B (second utilisateur pour les tests d'isolation) ────────────
setup("authenticate userB", async ({ page }) => {
  const email = process.env.E2E_USERB_EMAIL;
  const password = process.env.E2E_USERB_PASSWORD;

  if (!email || !password) {
    // Créer un fichier vide pour éviter que Playwright plante
    fs.writeFileSync(
      path.join(AUTH_DIR, "userB.json"),
      JSON.stringify({ cookies: [], origins: [] })
    );
    console.warn("[setup] E2E_USERB_EMAIL non défini → userB.json vide créé");
    return;
  }

  await page.goto("/");
  await page.waitForSelector('input[type="email"]', { timeout: 10_000 });
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL(/\/(dashboard|missions|bilan)/, { timeout: 15_000 });

  await page.context().storageState({ path: path.join(AUTH_DIR, "userB.json") });
  console.log("[setup] Session userB sauvegardée.");
});
