// e2e/helpers/navigation.ts
// Helpers de navigation et d'attente communs

import { type Page, expect } from "@playwright/test";

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

/** Attend la disparition des spinners de chargement */
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
