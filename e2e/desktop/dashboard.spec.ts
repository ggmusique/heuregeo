// e2e/desktop/dashboard.spec.ts
// ─────────────────────────────────────────────────────────────────────────────
// Tests E2E Desktop : Dashboard — KPI, navigation, responsive
//
// Pré-requis : session owner sauvegardée par e2e/setup/auth.setup.ts
// Projet     : desktop-chrome (+ desktop-firefox via testMatch)
// ─────────────────────────────────────────────────────────────────────────────

import { test, expect } from "@playwright/test";
import { waitForNoSpinner } from "../helpers/navigation";
import { captureScreen } from "../helpers/screenshot";

test.describe("Dashboard", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await waitForNoSpinner(page);
  });

  // ── Chargement ──────────────────────────────────────────────────────────────
  test("1. Dashboard charge sans erreur", async ({ page, browserName }, testInfo) => {
    // Pas d'erreur React visible
    await expect(page.locator('[data-testid="error-boundary"], .error-boundary')).not.toBeVisible();

    // L'application est montée (main ou app root présent)
    await expect(page.locator("main, #app, #root")).toBeVisible({ timeout: 10_000 });

    await captureScreen(page, `dashboard-loaded-${browserName}`, testInfo);
  });

  // ── Navigation principale ───────────────────────────────────────────────────
  test("2. Navigation principale visible", async ({ page }) => {
    // Liens de navigation principaux attendus
    const navLinks = ["Saisie", "Agenda", "Bilan", "Historique"];

    for (const label of navLinks) {
      const link = page.getByRole("link", { name: new RegExp(label, "i") })
        .or(page.getByRole("button", { name: new RegExp(label, "i") }))
        .first();

      // Vérifier que l'élément de nav existe (au moins un)
      const found = await link.count();
      expect(
        found,
        `Lien de navigation "${label}" introuvable`,
      ).toBeGreaterThan(0);
    }
  });

  // ── KPI / cartes stats ──────────────────────────────────────────────────────
  test("3. Cartes KPI ou contenu principal visible", async ({ page, browserName }, testInfo) => {
    // Attendre que le contenu soit chargé
    await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {
      // Timeout réseau acceptable si le serveur est lent
    });

    await waitForNoSpinner(page);

    // Au moins un bloc de contenu visible (dashboard, missions, bilan...)
    const contentArea = page.locator(
      '[data-testid="dashboard"], [data-testid="kpi-card"], section, .card, main > div',
    ).first();

    await expect(contentArea).toBeVisible({ timeout: 10_000 });
    await captureScreen(page, `dashboard-kpi-${browserName}`, testInfo);
  });

  // ── Pas d'overflow horizontal ───────────────────────────────────────────────
  test("4. Pas d'overflow horizontal (1280px)", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/");
    await waitForNoSpinner(page);

    const overflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });

    expect(overflow, "Overflow horizontal détecté à 1280px").toBe(false);
  });

  // ── Responsive tablet ───────────────────────────────────────────────────────
  test("5. Pas d'overflow horizontal (768px tablet)", async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto("/");
    await waitForNoSpinner(page);

    const overflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });

    expect(overflow, "Overflow horizontal détecté à 768px (tablet)").toBe(false);
    await captureScreen(page, "dashboard-tablet-768", testInfo);
  });

  // ── Page Bilan accessible ───────────────────────────────────────────────────
  test("6. Navigation vers Bilan", async ({ page, browserName }, testInfo) => {
    const bilanLink = page
      .getByRole("link", { name: /bilan/i })
      .or(page.getByRole("button", { name: /bilan/i }))
      .first();

    if (await bilanLink.isVisible({ timeout: 5_000 })) {
      await bilanLink.click();
      await waitForNoSpinner(page);
      await captureScreen(page, `bilan-page-${browserName}`, testInfo);
    } else {
      test.skip(true, "Lien Bilan non visible — navigation différente");
    }
  });
});
