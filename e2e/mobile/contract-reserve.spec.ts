import { test, expect, type Page } from "@playwright/test";

import { waitForAppReady, waitForNoSpinner } from "../helpers/navigation";

async function goToSuivi(page: Page): Promise<boolean> {
  await page.goto("/");
  await waitForAppReady(page);

  if (await page.locator('[data-testid="login-form"]').isVisible().catch(() => false)) {
    return false;
  }

  const suiviEntry = page
    .getByRole("button", { name: /suivi/i })
    .or(page.getByRole("link", { name: /suivi/i }))
    .first();

  if (!(await suiviEntry.isVisible({ timeout: 5_000 }).catch(() => false))) {
    return false;
  }

  await suiviEntry.click();
  await waitForNoSpinner(page);
  return true;
}

test.describe("Contrat V2 - Réserve persistante (mobile)", () => {
  test("1. Affiche banque d'heures et conserve le layout sans overflow", async ({ page }) => {
    const found = await goToSuivi(page);
    if (!found) {
      test.skip(true, "Suivi non accessible dans cette configuration mobile");
      return;
    }

    const reserveTab = page.getByRole("button", { name: /réserve heures/i }).first();
    if (!(await reserveTab.isVisible({ timeout: 3_000 }).catch(() => false))) {
      test.skip(true, "Contrat Pro/réserve non actifs pour ce compte mobile");
      return;
    }

    await reserveTab.click();
    await expect(page.getByText(/Banque d'heures/i)).toBeVisible({ timeout: 8_000 });

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    expect(overflow, "Overflow horizontal sur l'onglet réserve mobile").toBe(false);
  });
});
