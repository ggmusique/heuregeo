import { test, expect, type Page } from "@playwright/test";

import { waitForAppReady, waitForNoSpinner } from "../helpers/navigation";

const MONTH_OPTION_RE = /janvier|fevrier|février|mars|avril|mai|juin|juillet|aout|août|septembre|octobre|novembre|decembre|décembre/i;
const MONTH_LABEL_RE = /JANVIER|FÉVRIER|FEVRIER|MARS|AVRIL|MAI|JUIN|JUILLET|AOÛT|AOUT|SEPTEMBRE|OCTOBRE|NOVEMBRE|DÉCEMBRE|DECEMBRE/i;

async function goToBilan(page: Page): Promise<boolean> {
  await page.goto("/");
  await waitForAppReady(page);

  if (await page.locator('[data-testid="login-form"]').isVisible().catch(() => false)) {
    return false;
  }

  const bilanEntry = page
    .getByRole("link", { name: /bilan/i })
    .or(page.getByRole("button", { name: /rapport.*bilan|bilan/i }))
    .first();

  if (!(await bilanEntry.isVisible({ timeout: 5_000 }).catch(() => false))) {
    return false;
  }

  await bilanEntry.click();
  await waitForNoSpinner(page);
  await expect(page.locator('[data-testid="section-missions"], main, section').first()).toBeVisible({ timeout: 10_000 });
  return true;
}

async function openPeriodSelector(page: Page): Promise<void> {
  await page.getByRole("button", { name: /changer la période/i }).click();
}

async function selectMonthPeriod(page: Page): Promise<boolean> {
  await openPeriodSelector(page);
  const option = page.locator("button[aria-label]").filter({ hasText: MONTH_OPTION_RE }).first();
  if (!(await option.isVisible({ timeout: 3_000 }).catch(() => false))) {
    return false;
  }
  await option.click();
  await waitForNoSpinner(page);
  return true;
}

async function selectYearPeriod(page: Page): Promise<boolean> {
  await openPeriodSelector(page);
  const option = page.locator("button[aria-label]").filter({ hasText: /^20\d{2}$/ }).first();
  if (!(await option.isVisible({ timeout: 3_000 }).catch(() => false))) {
    return false;
  }
  await option.click();
  await waitForNoSpinner(page);
  return true;
}

test.describe("Hiérarchie temporelle du bilan", () => {
  test("1. Le mode mois affiche des cartes semaine, pas des cartes mission brutes", async ({ page }) => {
    const found = await goToBilan(page);
    if (!found) {
      test.skip(true, "Page Bilan non accessible dans cette configuration");
      return;
    }

    const switched = await selectMonthPeriod(page);
    if (!switched) {
      test.skip(true, "Aucune période mensuelle disponible pour ce jeu de données");
      return;
    }

    await expect(page.getByText(/Semaines du mois/i)).toBeVisible({ timeout: 8_000 });
    await expect(page.locator('[data-testid="section-missions"]').getByText(/Semaine\s+\d+/).first()).toBeVisible({ timeout: 8_000 });
    await expect(page.locator('[data-testid="section-missions"]').getByText(/\d{2}:\d{2}\s-\s\d{2}:\d{2}/)).toHaveCount(0);
  });

  test("2. Le mode année affiche des cartes mois et permet d'ouvrir le détail mensuel", async ({ page, browserName }) => {
    const found = await goToBilan(page);
    if (!found) {
      test.skip(true, "Page Bilan non accessible dans cette configuration");
      return;
    }

    const switched = await selectYearPeriod(page);
    if (!switched) {
      test.skip(true, "Aucune période annuelle disponible pour ce jeu de données");
      return;
    }

    await expect(page.getByText(/Mois de l'année/i)).toBeVisible({ timeout: 8_000 });
    await expect(page.locator('[data-testid="section-missions"]').getByText(MONTH_LABEL_RE).first()).toBeVisible({ timeout: 8_000 });

    const openMonthButton = page.getByRole("button", { name: /ouvrir le mois/i }).first();
    if (await openMonthButton.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await openMonthButton.click();
      await waitForNoSpinner(page);
      await expect(page.getByText(/Semaines du mois/i)).toBeVisible({ timeout: 8_000 });
    }

    if (browserName === "webkit") {
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
      expect(overflow, "Overflow horizontal sur la vue année du bilan (WebKit/iPhone)").toBe(false);
    }
  });
});