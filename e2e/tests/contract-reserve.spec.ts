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

async function openReserveTab(page: Page): Promise<boolean> {
  const found = await goToSuivi(page);
  if (!found) {
    return false;
  }

  const reserveTab = page.getByRole("button", { name: /réserve heures/i }).first();
  if (!(await reserveTab.isVisible({ timeout: 3_000 }).catch(() => false))) {
    return false;
  }

  await reserveTab.click();
  await expect(page.getByText(/Banque d'heures/i)).toBeVisible({ timeout: 8_000 });
  await expect(page.getByText(/Solde actuel/i)).toBeVisible({ timeout: 8_000 });
  return true;
}

async function submitMovement(page: Page, comment: string, hours: string): Promise<void> {
  await page.getByLabel("Heures").fill(hours);
  await page.getByLabel("Commentaire").fill(comment);
  await page.getByRole("button", { name: /enregistrer/i }).click();

  const backendErrorLocator = page.getByText(
    /contract_reserve_movements|schema cache|could not find the table|relation .* does not exist|permission denied/i,
  );

  await expect
    .poll(
      async () => {
        const commentCount = await page.getByText(comment).count();
        if (commentCount > 0) {
          return "saved";
        }
        const errorCount = await backendErrorLocator.count();
        if (errorCount > 0) {
          return "backend-error";
        }
        return "pending";
      },
      { timeout: 8_000 },
    )
    .not.toBe("pending");

  await expect(backendErrorLocator).toHaveCount(0);
  await expect(page.getByText(comment)).toBeVisible({ timeout: 8_000 });
}

test.describe("Contrat V2 - Réserve persistante (desktop)", () => {
  test("1. L'onglet réserve affiche le solde et persiste un mouvement utilisateur", async ({ page }) => {
    const reserveReady = await openReserveTab(page);
    if (!reserveReady) {
      test.skip(true, "Suivi non accessible dans cette configuration");
      return;
    }

    const comment = `e2e-reserve-${Date.now()}`;
    await submitMovement(page, comment, "0.5");

    await page.reload();
    await waitForAppReady(page);
    const reserveReadyAfterReload = await openReserveTab(page);
    expect(reserveReadyAfterReload).toBe(true);
    await expect(page.getByText(comment)).toBeVisible({ timeout: 8_000 });
  });

  test("2. Une consommation réserve est historisée et persistée", async ({ page }) => {
    const reserveReady = await openReserveTab(page);
    if (!reserveReady) {
      test.skip(true, "Contrat Pro/réserve non actifs pour ce compte");
      return;
    }

    const addComment = `e2e-reserve-add-${Date.now()}`;
    await submitMovement(page, addComment, "0.75");

    await page.getByRole("button", { name: /consommer/i }).click();
    const consumeComment = `e2e-reserve-consume-${Date.now()}`;
    await submitMovement(page, consumeComment, "0.25");

    await page.reload();
    await waitForAppReady(page);
    const reserveReadyAfterReload = await openReserveTab(page);
    expect(reserveReadyAfterReload).toBe(true);

    await expect(page.getByText(addComment)).toBeVisible({ timeout: 8_000 });
    await expect(page.getByText(consumeComment)).toBeVisible({ timeout: 8_000 });
  });
});
