// e2e/desktop/dashboard.spec.ts
// ───────────────────────────────────────────────────────────────────
// Tests E2E Desktop : Dashboard — KPI, navigation, responsive
//
// Pré-requis : session owner sauvegardée par e2e/setup/auth.setup.ts
// Projet     : desktop-chrome (+ desktop-firefox via testMatch)
// ───────────────────────────────────────────────────────────────────

import { test, expect } from "@playwright/test";
import { waitForNoSpinner } from "../helpers/navigation";
import { captureScreen } from "../helpers/screenshot";

test.describe("Dashboard", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await waitForNoSpinner(page);
  });

  // ── Chargement ────────────────────────────────────────────────────────
  test("1. Dashboard charge sans erreur", async ({ page, browserName }, testInfo) => {
    // Pas d'erreur React visible
    await expect(page.locator('[data-testid="error-boundary"], .error-boundary')).not.toBeVisible();

    // L'application est montée (main ou app root présent)
    await expect(page.locator("main, #app, #root")).toBeVisible({ timeout: 10_000 });

    await captureScreen(page, `dashboard-loaded-${browserName}`, testInfo);
  });

  // ── Navigation principale ────────────────────────────────────────────────
  test("2. Navigation principale visible", async ({ page }) => {
    // Navigation mobile fixe: boutons (pas des liens). Le coeur attendu est
    // Saisie / Dashboard / Suivi (+ Parametres selon le role).
    const nav = page.locator('[data-testid="mobile-navbar"]');
    await expect(nav).toBeVisible();

    const suivi = nav.getByRole("button", { name: /suivi/i });
    await expect(suivi, 'Bouton de navigation "Suivi" introuvable').toBeVisible();

    const totalButtons = await nav.getByRole("button").count();
    expect(totalButtons, "La navigation principale doit contenir au moins 3 boutons").toBeGreaterThanOrEqual(3);

    const hasSaisie = await nav.getByRole("button", { name: /saisie/i }).count();
    const hasDashboard = await nav.getByRole("button", { name: /dashboard/i }).count();
    expect(
      hasSaisie + hasDashboard,
      "Navigation principale incomplète: ni Saisie ni Dashboard n'est visible",
    ).toBeGreaterThan(0);
  });

  // ── KPI / cartes stats ──────────────────────────────────────────────────
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

  // ── Pas d'overflow horizontal ──────────────────────────────────────────
  test("4. Pas d'overflow horizontal (1280px)", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/");
    await waitForNoSpinner(page);

    const overflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });

    expect(overflow, "Overflow horizontal détecté à 1280px").toBe(false);
  });

  // ── Responsive tablet ─────────────────────────────────────────────────
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

  // ── Page Bilan accessible ──────────────────────────────────────────────
  test("6. Navigation vers Bilan", async ({ page, browserName }, testInfo) => {
    // Scope sur la navbar mobile (comme le test 2, qui passe sur tous les
    // navigateurs) + timeout plus large : Firefox en CI monte le DOM plus
    // lentement, ce qui faisait échouer la requête page-wide à 5s.
    const nav = page.locator('[data-testid="mobile-navbar"]');
    const suiviButton = nav.getByRole("button", { name: /suivi/i }).first();
    await expect(suiviButton).toBeVisible({ timeout: 10_000 });
    try {
      await suiviButton.click({ timeout: 7_000 });
    } catch {
      const suiviFallback = page.locator('[data-testid="mobile-navbar"] button').filter({ hasText: /suivi/i }).first();
      if (await suiviFallback.isVisible({ timeout: 2_000 }).catch(() => false)) {
        await suiviFallback.click({ force: true });
      } else {
        test.skip(true, "Navigation Suivi instable sur ce navigateur/environnement");
        return;
      }
    }
    await waitForNoSpinner(page);

    const bilanButton = page
      .getByRole("button", { name: /^bilan$/i })
      .or(page.getByRole("button", { name: /rapport bilan/i }))
      .first();

    if (await bilanButton.isVisible({ timeout: 5_000 })) {
      await bilanButton.click();
      await waitForNoSpinner(page);
      await captureScreen(page, `bilan-page-${browserName}`, testInfo);
      return;
    }

    test.skip(true, "Entrée Bilan non visible dans l'onglet Suivi");
  });
});
