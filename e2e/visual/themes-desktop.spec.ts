// e2e/visual/themes-desktop.spec.ts
// ─────────────────────────────────────────────────────────────────────────────
// Tests visuels — 4 thèmes × Desktop Chrome (1280×800)
//
// Projet : visual-desktop (playwright.visual.config.ts)
//
// Snapshots générés :
//   shell-desktop-neon.png    shell-desktop-oled.png
//   shell-desktop-emerald.png shell-desktop-arctic.png
//
// Ce qu'on teste :
//   - Apparence du shell sur un viewport large (1280×800)
//   - Cohérence des thèmes sur desktop (CSS vars, surfaces, accents)
//   - Position et layout de la navbar sur desktop
//   - Glassmorphisme desktop (pas de safe-area, rendering Chrome)
// ─────────────────────────────────────────────────────────────────────────────

import { test, expect } from "@playwright/test";
import { waitForAppReady } from "../helpers/navigation";
import {
  switchTheme,
  stabilizeForScreenshot,
  type Theme,
} from "../helpers/visual";

const THEMES: Theme[] = ["neon", "oled", "emerald", "arctic"];

// ── Snapshots Shell par thème (Desktop) ──────────────────────────────────────

// Clip fixe depuis le bas du viewport — déterministe entre runs.
// 80px : couvre la navbar desktop (~60px) + fond minimal. Évite le contenu
// dynamique (missions) qui occupe la zone au-dessus de la navbar.
const DESKTOP_CLIP_HEIGHT = 80;

test.describe("Shell desktop — 4 thèmes (Chrome 1280×800)", () => {
  for (const theme of THEMES) {
    test(`Shell desktop — thème ${theme}`, async ({ page }) => {
      await page.goto("/");
      await waitForAppReady(page);
      await switchTheme(page, theme);

      const navbar = page.locator('[data-testid="mobile-navbar"]');
      await expect(navbar).toBeVisible({ timeout: 5_000 });

      const vp = page.viewportSize() ?? { width: 1280, height: 800 };
      await expect(page).toHaveScreenshot(`shell-desktop-${theme}.png`, {
        clip: { x: 0, y: vp.height - DESKTOP_CLIP_HEIGHT, width: vp.width, height: DESKTOP_CLIP_HEIGHT },
      });
    });
  }
});

// ── Snapshot de référence desktop ────────────────────────────────────────────

test.describe("Shell desktop — État authentifié par défaut", () => {
  test("Shell desktop neon — chargement initial", async ({ page }) => {
    await page.goto("/");
    await waitForAppReady(page);
    await stabilizeForScreenshot(page);

    const navbar = page.locator('[data-testid="mobile-navbar"]');
    await expect(navbar).toBeVisible({ timeout: 5_000 });

    const vp = page.viewportSize() ?? { width: 1280, height: 800 };
    await expect(page).toHaveScreenshot("shell-desktop-initial.png", {
      clip: { x: 0, y: vp.height - DESKTOP_CLIP_HEIGHT, width: vp.width, height: DESKTOP_CLIP_HEIGHT },
    });
  });
});
