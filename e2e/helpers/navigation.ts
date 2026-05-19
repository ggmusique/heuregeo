// e2e/helpers/navigation.ts
// Helpers de navigation et d'attente communs

import { type Page, expect } from "@playwright/test";

/**
 * Attend que l'app soit dans un état stable après le chargement initial.
 *
 * Séquence attendue :
 *   1. [data-testid="app-loading-screen"] visible ≥2500ms (AuthGate minDelay)
 *   2. Splash disparaît → soit [app-shell] (auth OK) soit [login-form] (non-auth)
 *
 * Sans waitForTimeout(). Synchronisation précise via data-testid.
 * Timeout 15s pour absorber les 2500ms minDelay + latence réseau.
 */
export async function waitForAppReady(page: Page): Promise<void> {
  // Étape 1 : le splash screen doit disparaître
  await expect(
    page.locator('[data-testid="app-loading-screen"]'),
  ).not.toBeVisible({ timeout: 15_000 });

  // Étape 2 : état stable — app-shell (authentifié) OU login-form (non authentifié)
  await page.waitForFunction(
    () =>
      document.querySelector('[data-testid="app-shell"]') !== null ||
      document.querySelector('[data-testid="login-form"]') !== null,
    { timeout: 8_000 },
  );
}

/** Attend que le dashboard soit chargé (spinner disparu) */
export async function waitForDashboard(page: Page): Promise<void> {
  await expect(page.locator('[data-testid="dashboard"], main')).toBeVisible({ timeout: 10_000 });
}

/** Navigue vers la liste des missions */
export async function goToMissions(page: Page): Promise<void> {
  await page.goto("/");
  // Cherche le lien "Missions" dans la navigation
  const missionLink = page.getByRole("link", { name: /missions/i }).first();
  if (await missionLink.isVisible()) {
    await missionLink.click();
  }
  await page.waitForURL(/missions/, { timeout: 5_000 });
}

/** Attend la disparition des spinners de chargement (legacy — préférer waitForAppReady) */
export async function waitForNoSpinner(page: Page): Promise<void> {
  const spinner = page.locator('[data-testid="spinner"], .animate-spin');
  if (await spinner.isVisible()) {
    await expect(spinner).not.toBeVisible({ timeout: 10_000 });
  }
}

/** Ferme un modal si visible */
export async function closeModalIfOpen(page: Page): Promise<void> {
  const closeButton = page.getByRole("button", { name: /fermer|annuler|close/i });
  if (await closeButton.isVisible({ timeout: 500 })) {
    await closeButton.click();
  }
}
