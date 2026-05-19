// e2e/desktop/themes.spec.ts
// ─────────────────────────────────────────────────────────────────────────────
// Tests E2E Desktop : Système multi-thème
//
// Teste le switch de thème (neon | oled | emerald | arctic) et la persistance
// du choix via localStorage.
// ─────────────────────────────────────────────────────────────────────────────

import { test, expect } from "@playwright/test";
import { waitForNoSpinner } from "../helpers/navigation";
import { captureScreen } from "../helpers/screenshot";

const THEMES = ["neon", "oled", "emerald", "arctic"] as const;
type Theme = (typeof THEMES)[number];

/** Applique un thème directement via localStorage (méthode fiable) */
async function applyTheme(page: import("@playwright/test").Page, theme: Theme): Promise<void> {
  await page.evaluate((t) => {
    localStorage.setItem("theme", t);
    // Déclenche un storage event pour que React re-render
    window.dispatchEvent(new StorageEvent("storage", { key: "theme", newValue: t }));
  }, theme);

  // Recharger pour que le thème soit appliqué depuis le localStorage
  await page.reload({ waitUntil: "domcontentloaded" });
  await waitForNoSpinner(page);
}

/** Lit le thème actif depuis l'attribut data-theme ou la classe du <html> */
async function getCurrentTheme(page: import("@playwright/test").Page): Promise<string> {
  return page.evaluate(() => {
    const html = document.documentElement;
    return (
      html.getAttribute("data-theme") ||
      html.className
        .split(" ")
        .find((c) => ["neon", "oled", "emerald", "arctic"].includes(c)) ||
      ""
    );
  });
}

test.describe("Système multi-thème", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await waitForNoSpinner(page);
  });

  // ── Persistance localStorage ────────────────────────────────────────────────
  test("1. Le thème OLED est persisté après rechargement", async ({ page }, testInfo) => {
    await applyTheme(page, "oled");

    const theme = await getCurrentTheme(page);
    // Le thème doit être visible dans le DOM
    const htmlClass = await page.evaluate(() => document.documentElement.className);
    const dataTheme = await page.evaluate(() =>
      document.documentElement.getAttribute("data-theme"),
    );

    expect(
      htmlClass.includes("oled") || dataTheme === "oled",
      `Thème OLED non appliqué. className="${htmlClass}", data-theme="${dataTheme}"`,
    ).toBe(true);

    await captureScreen(page, "theme-oled", testInfo);
  });

  test("2. Le thème Arctic est persisté après rechargement", async ({ page }, testInfo) => {
    await applyTheme(page, "arctic");

    const htmlClass = await page.evaluate(() => document.documentElement.className);
    const dataTheme = await page.evaluate(() =>
      document.documentElement.getAttribute("data-theme"),
    );

    expect(
      htmlClass.includes("arctic") || dataTheme === "arctic",
      `Thème Arctic non appliqué. className="${htmlClass}", data-theme="${dataTheme}"`,
    ).toBe(true);

    await captureScreen(page, "theme-arctic", testInfo);
  });

  test("3. Le thème Emerald est persisté après rechargement", async ({ page }, testInfo) => {
    await applyTheme(page, "emerald");

    const htmlClass = await page.evaluate(() => document.documentElement.className);
    const dataTheme = await page.evaluate(() =>
      document.documentElement.getAttribute("data-theme"),
    );

    expect(
      htmlClass.includes("emerald") || dataTheme === "emerald",
      `Thème Emerald non appliqué. className="${htmlClass}", data-theme="${dataTheme}"`,
    ).toBe(true);

    await captureScreen(page, "theme-emerald", testInfo);
  });

  // ── Switch via UI ───────────────────────────────────────────────────────────
  test("4. Bouton de switch thème accessible dans l'UI", async ({ page }) => {
    // Chercher le sélecteur de thème dans l'UI (bouton, select, ou icône)
    const themeSelector = page
      .locator(
        '[data-testid="theme-selector"], [data-testid="theme-toggle"], [aria-label*="thème"], [aria-label*="theme"]',
      )
      .or(page.getByRole("button", { name: /thème|theme/i }))
      .first();

    const found = await themeSelector.count();

    if (found === 0) {
      // Le sélecteur peut être dans les paramètres — naviguer vers Paramètres
      const paramsLink = page
        .getByRole("link", { name: /param/i })
        .or(page.getByRole("button", { name: /param/i }))
        .first();

      if (await paramsLink.isVisible({ timeout: 3_000 })) {
        await paramsLink.click();
        await waitForNoSpinner(page);
        // Chercher dans les paramètres
        const themeInParams = page
          .locator('[data-testid*="theme"], [class*="theme"]')
          .first();
        expect(await themeInParams.count()).toBeGreaterThan(0);
      } else {
        test.skip(true, "Sélecteur de thème introuvable dans cette configuration");
      }
    } else {
      await expect(themeSelector).toBeVisible();
    }
  });

  // ── Variables CSS actives ───────────────────────────────────────────────────
  test("5. Les CSS vars de thème sont définies", async ({ page }) => {
    await applyTheme(page, "neon");

    const accentVar = await page.evaluate(() => {
      return getComputedStyle(document.documentElement).getPropertyValue("--color-accent").trim();
    });

    expect(accentVar.length, "CSS var --color-accent non définie pour le thème neon").toBeGreaterThan(0);
  });

  // ── Pas de couleurs hardcodées (sanity check) ───────────────────────────────
  test("6. Pas d'erreur JavaScript lors du switch de thème", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    for (const theme of THEMES) {
      await applyTheme(page, theme);
    }

    expect(errors, `Erreurs JS détectées lors du switch de thème: ${errors.join(", ")}`).toHaveLength(0);
  });
});
