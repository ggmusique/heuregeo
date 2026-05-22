// e2e/visual/themes-mobile.spec.ts
// ─────────────────────────────────────────────────────────────────────────────
// Tests visuels — 4 thèmes × iPhone 15 WebKit
//
// Projet : visual-iphone (playwright.visual.config.ts)
//
// Snapshots générés :
//   navbar-neon.png    navbar-oled.png    navbar-emerald.png    navbar-arctic.png
//   shell-neon.png     shell-oled.png     shell-emerald.png     shell-arctic.png
//
// Ce qu'on teste :
//   - Glassmorphisme de l'AppNavBar par thème (backdrop-blur, borders, bg)
//   - Position + dimensions de la navbar (safe-area bottom)
//   - Cohérence visuelle du shell (header + bg) — <main> masqué (données dynamiques)
//   - Rendu WebKit/Safari spécifique (backdrop-filter, subpixel fonts)
// ─────────────────────────────────────────────────────────────────────────────

import { test, expect } from "@playwright/test";
import { waitForAppReady } from "../helpers/navigation";
import {
  switchTheme,
  stabilizeForScreenshot,
  type Theme,
} from "../helpers/visual";

const THEMES: Theme[] = ["neon", "oled", "emerald", "arctic"];

// ── Snapshots Navbar par thème ────────────────────────────────────────────────

test.describe("AppNavBar — Glass & thèmes (iPhone 15 WebKit)", () => {
  for (const theme of THEMES) {
    test(`Navbar glass — thème ${theme}`, async ({ page }) => {
      // Chargement initial avec le thème owner.json (neon par défaut)
      await page.goto("/");
      await waitForAppReady(page);

      // Basculer vers le thème cible + stabiliser
      await switchTheme(page, theme);

      const navbar = page.locator('[data-testid="mobile-navbar"]');
      await expect(navbar).toBeVisible({ timeout: 5_000 });

      // Arctic (thème clair) : env(safe-area-inset-bottom) varie de ±2px entre runs
      // WebKit → taille de l'élément non-déterministe → size mismatch catastrophique.
      // Fix : clip fixe depuis le bas du viewport (100px), même stratégie que shell tests.
      // Pour neon/oled/emerald (fond sombre) : element screenshot — stable.
      if (theme === "arctic") {
        const vp = page.viewportSize() ?? { width: 393, height: 852 };
        await expect(page).toHaveScreenshot(`navbar-${theme}.png`, {
          clip: { x: 0, y: vp.height - 100, width: vp.width, height: 100 },
        });
      } else {
        await expect(navbar).toHaveScreenshot(`navbar-${theme}.png`);
      }
    });
  }
});

// ── Snapshots Shell — fond de page + navbar en contexte ──────────────────────

// Clip fixe depuis le bas du viewport — déterministe entre runs WebKit.
// Ne pas utiliser navbar.boundingBox() : le safe-area iPhone varie de ±2px.
const MOBILE_CLIP_HEIGHT = 160; // Couvre navbar (~90px) + fond (70px)

test.describe("Shell bottom — Background + navbar (iPhone 15 WebKit)", () => {
  for (const theme of THEMES) {
    test(`Background + navbar — thème ${theme}`, async ({ page }) => {
      await page.goto("/");
      await waitForAppReady(page);
      await switchTheme(page, theme);

      // Attend que la navbar soit visible (rendu complet) — pas de boundingBox()
      const navbar = page.locator('[data-testid="mobile-navbar"]');
      await expect(navbar).toBeVisible({ timeout: 5_000 });

      const vp = page.viewportSize() ?? { width: 393, height: 852 };
      // Clip fixe : derniers 160px du viewport. Toujours 393×160.
      await expect(page).toHaveScreenshot(`shell-${theme}.png`, {
        clip: { x: 0, y: vp.height - MOBILE_CLIP_HEIGHT, width: vp.width, height: MOBILE_CLIP_HEIGHT },
      });
    });
  }
});

// ── Snapshot de référence par défaut ─────────────────────────────────────────

test.describe("Shell — État authentifié par défaut", () => {
  test("Shell thème neon — chargement initial", async ({ page }) => {
    // Sans switchTheme() — capture l'état exact à l'authentification
    await page.goto("/");
    await waitForAppReady(page);
    await stabilizeForScreenshot(page);

    const navbar = page.locator('[data-testid="mobile-navbar"]');
    await expect(navbar).toBeVisible({ timeout: 5_000 });

    const vp = page.viewportSize() ?? { width: 393, height: 852 };
    await expect(page).toHaveScreenshot("shell-initial.png", {
      clip: { x: 0, y: vp.height - MOBILE_CLIP_HEIGHT, width: vp.width, height: MOBILE_CLIP_HEIGHT },
    });
  });
});
