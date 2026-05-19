// e2e/tests/auth.spec.ts
// ─────────────────────────────────────────────────────────────────────────────
// Tests E2E : Authentification, session, logout
// ─────────────────────────────────────────────────────────────────────────────

import { test, expect } from "@playwright/test";
import { waitForAppReady } from "../helpers/navigation";

test.describe("Authentification", () => {
  // Ces tests ne dépendent pas de la session sauvegardée : ils testent
  // le flow de login depuis un état non-authentifié.
  test.use({ storageState: { cookies: [], origins: [] } });

  test("1. Redirige vers la page de login si non authentifié", async ({ page }) => {
    await page.goto("/");
    await waitForAppReady(page);
    // L'app doit afficher le formulaire de connexion (pas l'app-shell)
    await expect(page.locator('[data-testid="login-form"]')).toBeVisible({ timeout: 5_000 });
  });

  test("2. Login avec mauvaises credentials → message d'erreur", async ({ page }) => {
    await page.goto("/");
    await waitForAppReady(page);
    await expect(page.locator('[data-testid="login-form"]')).toBeVisible({ timeout: 5_000 });

    await page.fill('input[type="email"]', "nonexistant@example.com");
    await page.fill('input[type="password"]', "mauvais-mot-de-passe-123");
    await page.click('button[type="submit"]');

    // Doit afficher un message d'erreur (pas de crash)
    await expect(
      page.locator('[data-testid="auth-error"], .error, [role="alert"]')
    ).toBeVisible({ timeout: 8_000 });
  });

  test("3. Login valide → app-shell visible (SPA, URL invariante)", async ({ page }) => {
    const email = process.env.E2E_OWNER_EMAIL;
    const password = process.env.E2E_OWNER_PASSWORD;

    if (!email || !password) {
      test.skip(true, "Credentials E2E non configurés");
      return;
    }

    await page.goto("/");
    await waitForAppReady(page);
    await expect(page.locator('[data-testid="login-form"]')).toBeVisible({ timeout: 5_000 });

    await page.fill('input[type="email"]', email);
    await page.fill('input[type="password"]', password);
    await page.click('button[type="submit"]');

    // L'app est une SPA : l'URL ne change JAMAIS après login.
    // Signal fiable : login-form disparaît, app-shell apparaît.
    await expect(
      page.locator('[data-testid="login-form"]'),
      "Le formulaire de login n'a pas disparu — connexion échouée ?",
    ).not.toBeVisible({ timeout: 20_000 });

    await expect(
      page.locator('[data-testid="app-shell"]'),
      "L'app-shell n'est pas apparu après connexion",
    ).toBeVisible({ timeout: 10_000 });

    // Pas d'écran d'erreur
    await expect(page.locator('[data-testid="auth-error"]')).not.toBeVisible();
  });

  test("4. Session expirée → retour login (simulation localStorage vide)", async ({ page }) => {
    // Efface le localStorage pour simuler une session expirée
    await page.goto("/");
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await page.reload();
    await waitForAppReady(page);

    // Doit afficher le formulaire de login
    await expect(page.locator('[data-testid="login-form"]')).toBeVisible({ timeout: 5_000 });
  });
});

test.describe("Authentification — utilisateur connecté", () => {
  // Utilise la session owner sauvegardée
  test("5. Logout déconnecte et redirige vers login", async ({ page }) => {
    await page.goto("/");
    await waitForAppReady(page);

    // Cherche le bouton de déconnexion (dans le menu profil)
    const logoutButton = page
      .getByRole("button", { name: /d[eé]connexion|se d[eé]connecter|logout/i })
      .first();

    if (!(await logoutButton.isVisible({ timeout: 2_000 }))) {
      // Essayer d'ouvrir le menu utilisateur d'abord
      const profileButton = page
        .getByRole("button", { name: /profil|compte|menu/i })
        .first();
      if (await profileButton.isVisible({ timeout: 2_000 })) {
        await profileButton.click();
      }
    }

    await expect(logoutButton).toBeVisible({ timeout: 5_000 });
    await logoutButton.click();

    // Après logout → login-form doit réapparaître
    await waitForAppReady(page);
    await expect(page.locator('[data-testid="login-form"]')).toBeVisible({ timeout: 10_000 });
  });
});
