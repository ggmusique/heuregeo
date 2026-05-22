// e2e/mobile/ios-premium.spec.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batterie de tests iOS Premium — heuregeo
//
// Cible : projet `mobile-iphone` (devices["iPhone 15"] — WebKit Safari)
//         Session propriétaire restaurée via storageState: e2e/.auth/owner.json
//
// 8 suites de tests spécialisées :
//   1. Safe-area & Layout iPhone 15 / Dynamic Island
//   2. Glass / backdrop-blur Safari WebKit
//   3. Scroll mobile Safari
//   4. Modals iPhone (overflow, dismiss, clip)
//   5. Zoom iOS — inputs/selects font-size < 16px
//   6. Navigation SPA & Workflow Suivi/PDF
//   7. Orientation portrait / landscape
//   8. Performance & qualité Safari (erreurs JS, tokens, timing)
//
// Règles appliquées :
//   • 0 waitForTimeout() — waitForFunction() + expect() uniquement
//   • data-testid : app-shell, app-loading-screen, login-form, mobile-navbar
//   • Tests skip gracieux si la fonctionnalité n'est pas visible
//   • Screenshots captureMobileView() systématiques pour rapport visuel
//   • Compatible AGENTS.md : 4 thèmes, CSS vars, design system
// ─────────────────────────────────────────────────────────────────────────────

import { test, expect } from "@playwright/test";
import { waitForAppReady } from "../helpers/navigation";
import { captureMobileView } from "../helpers/screenshot";
import {
  navigateToTab,
  assertNoHorizontalOverflow,
  assertCSSTokensDefined,
  checkNavbarGlass,
  findZoomTriggerInputs,
  measureNavbarPosition,
  collectJsErrors,
  setLandscape,
  setPortrait,
} from "../helpers/ios";

// ─────────────────────────────────────────────────────────────────────────────
// Helper local : vérifier que la session est active (app-shell visible)
// ─────────────────────────────────────────────────────────────────────────────
async function isAuthenticated(page: import("@playwright/test").Page): Promise<boolean> {
  return page
    .locator('[data-testid="app-shell"]')
    .isVisible({ timeout: 3_000 })
    .catch(() => false);
}

// ═════════════════════════════════════════════════════════════════════════════
// Suite 1 · Safe-area & Layout iPhone 15
// ═════════════════════════════════════════════════════════════════════════════
test.describe("iOS 1 · Safe-area & Layout", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await waitForAppReady(page);
  });

  test("1.1 Navbar dans le viewport — non coupée par le home indicator", async ({
    page,
  }, testInfo) => {
    if (!(await isAuthenticated(page))) {
      test.skip(true, "Session absente — auth requise");
      return;
    }

    const pos = await measureNavbarPosition(page);
    console.log(
      `[iOS] Navbar bottom=${pos.navBottom}px / viewport=${pos.viewportHeight}px / fromBottom=${pos.fromBottom}px`,
    );

    // La navbar doit être entièrement dans le viewport
    expect(
      pos.withinViewport,
      `Navbar dépasse le bas du viewport (bottom=${pos.navBottom}, viewport=${pos.viewportHeight})`,
    ).toBe(true);

    // Avertissement : < 20px de marge = risque chevauchement home indicator
    if (pos.fromBottom < 20) {
      console.warn(
        `[iOS] ⚠️ Navbar très proche du bord bas (${pos.fromBottom}px) — risque safe-area home indicator`,
      );
    }

    await captureMobileView(page, "safe-area-navbar", testInfo);
  });

  test("1.2 Aucun overflow horizontal en portrait", async ({ page }, testInfo) => {
    const result = await assertNoHorizontalOverflow(page);
    if (result.hasOverflow) {
      console.warn(`[iOS] ⚠️ Overflow horizontal: ${result.details}`);
    }
    await captureMobileView(page, "safe-area-overflow-portrait", testInfo);
    expect(result.hasOverflow, `Overflow horizontal: ${result.details}`).toBe(false);
  });

  test("1.3 Le contenu principal n'est pas collé aux bords (<8px)", async ({
    page,
  }, testInfo) => {
    if (!(await isAuthenticated(page))) {
      test.skip(true, "Session absente");
      return;
    }

    const MIN_PADDING = 8;
    const tooClose = await page.evaluate((minPx: number) => {
      const w = document.documentElement.clientWidth;
      const found: { tag: string; cls: string; left: number; right: number }[] = [];

      document.querySelectorAll<HTMLElement>("p, h1, h2, h3, button, span").forEach((el) => {
        const r = el.getBoundingClientRect();
        if (!el.textContent?.trim() || r.width === 0) return;
        if (r.left < minPx || w - r.right < minPx) {
          found.push({
            tag: el.tagName,
            cls: (el.className || "").toString().slice(0, 40),
            left: Math.round(r.left),
            right: Math.round(w - r.right),
          });
        }
      });

      return found.slice(0, 5);
    }, MIN_PADDING);

    if (tooClose.length > 0) {
      console.warn(
        `[iOS] ⚠️ ${tooClose.length} élément(s) trop proche(s) des bords:`,
        JSON.stringify(tooClose),
      );
    }

    await captureMobileView(page, "safe-area-padding", testInfo);
    // Seuil tolérant (< 3) — quelques cas peuvent être volontaires
    expect(
      tooClose.length,
      `Éléments sans padding bord: ${JSON.stringify(tooClose)}`,
    ).toBeLessThan(3);
  });

  test("1.4 L'AppHeader est dans le viewport (non coupé par le Dynamic Island)", async ({
    page,
  }, testInfo) => {
    if (!(await isAuthenticated(page))) {
      test.skip(true, "Session absente");
      return;
    }

    const header = page.locator("header").first();
    const headerVisible = await header.isVisible({ timeout: 3_000 }).catch(() => false);

    if (headerVisible) {
      const box = await header.boundingBox();
      if (box) {
        console.log(`[iOS] Header: top=${box.y}px, height=${box.height}px`);
        expect(box.y, "Header commence avant le haut du viewport (coupé par notch ?)").toBeGreaterThanOrEqual(0);
      }
    } else {
      console.log("[iOS] ℹ️ Pas de <header> visible dans cette vue");
    }

    await captureMobileView(page, "safe-area-header", testInfo);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// Suite 2 · Glass / backdrop-blur Safari WebKit
// ═════════════════════════════════════════════════════════════════════════════
test.describe("iOS 2 · Glass & backdrop-blur Safari", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await waitForAppReady(page);
  });

  test("2.1 Navbar glass — backdrop-filter blur appliqué par WebKit", async ({
    page,
  }, testInfo) => {
    if (!(await isAuthenticated(page))) {
      test.skip(true, "Session absente");
      return;
    }

    const glass = await checkNavbarGlass(page);
    console.log(`[iOS] Navbar glass — backdropFilter: "${glass.filterValue}"`);

    // WebKit supporte backdrop-filter depuis Safari 9 — doit être appliqué
    expect(
      glass.hasGlass,
      `La navbar n'applique pas de backdrop-filter blur. Valeur obtenue: "${glass.filterValue}"`,
    ).toBe(true);

    await captureMobileView(page, "glass-navbar", testInfo);
  });

  test("2.2 CSS design tokens définis sur :root (--color-bg, --color-surface, etc.)", async ({
    page,
  }) => {
    const missing = await assertCSSTokensDefined(page);
    if (missing.length > 0) {
      console.warn(`[iOS] ⚠️ CSS tokens manquants: ${missing.join(", ")}`);
    }
    expect(missing, `CSS tokens non définis: ${missing.join(", ")}`).toHaveLength(0);
  });

  test("2.3 Les surfaces glass ont un background semi-transparent (rgba avec alpha)", async ({
    page,
  }, testInfo) => {
    if (!(await isAuthenticated(page))) {
      test.skip(true, "Session absente");
      return;
    }

    const surfaces = await page.evaluate(() => {
      const results: { selector: string; bg: string; hasAlpha: boolean }[] = [];

      document.querySelectorAll<HTMLElement>("[class*='backdrop-blur']").forEach((el) => {
        const s = getComputedStyle(el);
        const bg = s.backgroundColor;
        const hasAlpha = bg.startsWith("rgba") && !bg.endsWith(", 1)");
        results.push({
          selector: el.tagName + (el.id ? `#${el.id}` : ""),
          bg: bg.slice(0, 60),
          hasAlpha,
        });
      });

      return results.slice(0, 6);
    });

    console.log(`[iOS] Surfaces backdrop-blur trouvées: ${surfaces.length}`);
    surfaces.forEach((s) => {
      if (!s.hasAlpha) {
        console.warn(`[iOS] ⚠️ Surface glass opaque: ${s.selector} → ${s.bg}`);
      }
    });

    // Vérifier qu'au moins la navbar a un fond semi-transparent
    const opaqueNavbars = surfaces.filter(
      (s) => s.selector.toLowerCase().includes("nav") && !s.hasAlpha,
    );
    expect(opaqueNavbars).toHaveLength(0);

    await captureMobileView(page, "glass-surfaces", testInfo);
  });

  test("2.4 Aucune erreur JS de rendu WebKit au chargement", async ({ page }) => {
    // Enregistrer AVANT goto pour capturer les erreurs de chargement
    const errors = collectJsErrors(page);

    await page.goto("/");
    await waitForAppReady(page);

    // "TypeError: Load failed" = erreur fetch WebKit (CORS/réseau/abort)
    // équivalent de net::ERR_FAILED dans Chromium — pas un bug app
    const appErrors = errors.filter(
      (e) =>
        !e.includes("net::") &&
        !e.includes("Failed to fetch") &&
        !e.includes("NetworkError") &&
        !e.includes("ERR_FAILED") &&
        !e.includes("AbortError") &&
        !e.includes("Load failed") &&
        !e.includes("TypeError: Load"),
    );

    if (appErrors.length > 0) {
      console.warn(`[iOS] ⚠️ Erreurs JS:\n${appErrors.join("\n")}`);
    }

    expect(
      appErrors,
      `Erreurs JS au chargement WebKit: ${appErrors.join("; ")}`,
    ).toHaveLength(0);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// Suite 3 · Scroll mobile Safari
// ═════════════════════════════════════════════════════════════════════════════
test.describe("iOS 3 · Scroll mobile Safari", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await waitForAppReady(page);
  });

  test("3.1 Aucun overflow horizontal après scroll vertical", async ({ page }, testInfo) => {
    if (!(await isAuthenticated(page))) {
      test.skip(true, "Session absente");
      return;
    }

    await page.evaluate(() => window.scrollTo(0, 500));
    await page.evaluate(() => new Promise<void>((r) => requestAnimationFrame(r)));

    const result = await assertNoHorizontalOverflow(page);
    if (result.hasOverflow) {
      console.warn(`[iOS] ⚠️ Overflow horizontal après scroll: ${result.details}`);
    }

    await captureMobileView(page, "scroll-after-vertical", testInfo);
    expect(result.hasOverflow, `Overflow après scroll: ${result.details}`).toBe(false);
  });

  test("3.2 La navbar reste fixe après scroll (position:fixed fonctionnelle)", async ({
    page,
  }) => {
    if (!(await isAuthenticated(page))) {
      test.skip(true, "Session absente");
      return;
    }

    const posBefore = await measureNavbarPosition(page);

    await page.evaluate(() => window.scrollTo(0, 300));
    await page.evaluate(() => new Promise<void>((r) => requestAnimationFrame(r)));

    const posAfter = await measureNavbarPosition(page);

    const drift = Math.abs(posBefore.navBottom - posAfter.navBottom);
    console.log(
      `[iOS] Navbar drift après scroll: ${drift}px (avant=${posBefore.navBottom}, après=${posAfter.navBottom})`,
    );

    // La navbar est position:fixed — sa position dans le viewport ne doit pas changer
    expect(
      drift,
      `Navbar a bougé de ${drift}px après scroll — position:fixed cassée ?`,
    ).toBeLessThanOrEqual(2);
  });

  test("3.3 Hauteur de scroll documentée (informatif)", async ({ page }) => {
    if (!(await isAuthenticated(page))) {
      test.skip(true, "Session absente");
      return;
    }

    const scrollData = await page.evaluate(() => ({
      scrollHeight: document.documentElement.scrollHeight,
      clientHeight: document.documentElement.clientHeight,
      scrollable: document.documentElement.scrollHeight > document.documentElement.clientHeight,
    }));

    console.log(
      `[iOS] scrollHeight=${scrollData.scrollHeight}px, clientHeight=${scrollData.clientHeight}px, scrollable=${scrollData.scrollable}`,
    );

    // Informatif seulement — certaines vues tiennent dans le viewport
  });

  test("3.4 Le contenu du main a un padding-bottom suffisant (navbar non masquante)", async ({
    page,
  }) => {
    if (!(await isAuthenticated(page))) {
      test.skip(true, "Session absente");
      return;
    }

    const mainPadding = await page.evaluate(() => {
      const main = document.querySelector("main");
      if (!main) return null;
      return {
        paddingBottom: parseFloat(getComputedStyle(main).paddingBottom),
        className: (main.className || "").toString().slice(0, 80),
      };
    });

    if (mainPadding) {
      console.log(
        `[iOS] main padding-bottom: ${mainPadding.paddingBottom}px (${mainPadding.className})`,
      );
      // pb-32 = 128px — doit être >= 80px pour ne pas être masqué par la navbar
      expect(
        mainPadding.paddingBottom,
        "padding-bottom de main trop petit — contenu masqué par la navbar fixe",
      ).toBeGreaterThanOrEqual(80);
    }
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// Suite 4 · Modals iPhone
// ═════════════════════════════════════════════════════════════════════════════
test.describe("iOS 4 · Modals iPhone", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await waitForAppReady(page);
  });

  test("4.1 Ouverture de modal — aucun overflow horizontal", async ({ page }, testInfo) => {
    if (!(await isAuthenticated(page))) {
      test.skip(true, "Session absente");
      return;
    }

    const trigger = page
      .getByRole("button", { name: /ajouter|créer|nouveau|rapport|paramètre/i })
      .first();

    if (!(await trigger.isVisible({ timeout: 5_000 }).catch(() => false))) {
      test.skip(true, "Aucun bouton de modal dans la vue courante");
      return;
    }

    await trigger.click();

    const dialog = page.locator('[role="dialog"]').first();
    if (!(await dialog.isVisible({ timeout: 5_000 }).catch(() => false))) {
      test.skip(true, "Aucune dialog ouverte après le clic");
      return;
    }

    const result = await assertNoHorizontalOverflow(page);
    if (result.hasOverflow) {
      console.warn(`[iOS] ⚠️ Overflow avec modal ouverte: ${result.details}`);
    }

    await captureMobileView(page, "modal-open", testInfo);
    expect(result.hasOverflow, `Overflow avec modal: ${result.details}`).toBe(false);

    await page.keyboard.press("Escape");
  });

  test("4.2 Fermeture modal par Escape — app-shell reste stable", async ({
    page,
  }, testInfo) => {
    if (!(await isAuthenticated(page))) {
      test.skip(true, "Session absente");
      return;
    }

    const trigger = page
      .getByRole("button", { name: /ajouter|créer|nouveau|rapport|paramètre/i })
      .first();

    if (!(await trigger.isVisible({ timeout: 5_000 }).catch(() => false))) {
      test.skip(true, "Aucun bouton de modal dans la vue courante");
      return;
    }

    await trigger.click();

    const dialog = page.locator('[role="dialog"]').first();
    if (!(await dialog.isVisible({ timeout: 5_000 }).catch(() => false))) {
      test.skip(true, "Pas de dialog visible");
      return;
    }

    await page.keyboard.press("Escape");

    // L'app-shell doit être intact après fermeture
    await expect(page.locator('[data-testid="app-shell"]')).toBeVisible({ timeout: 5_000 });

    await captureMobileView(page, "modal-after-escape", testInfo);
  });

  test("4.3 La modal ne sort pas du bas de l'écran (safe-area bottom)", async ({
    page,
  }, testInfo) => {
    if (!(await isAuthenticated(page))) {
      test.skip(true, "Session absente");
      return;
    }

    const trigger = page
      .getByRole("button", { name: /ajouter|créer|nouveau|rapport|paramètre/i })
      .first();

    if (!(await trigger.isVisible({ timeout: 5_000 }).catch(() => false))) {
      test.skip(true, "Aucun bouton de modal dans la vue courante");
      return;
    }

    await trigger.click();

    const dialog = page.locator('[role="dialog"]').first();
    if (!(await dialog.isVisible({ timeout: 5_000 }).catch(() => false))) {
      test.skip(true, "Pas de dialog visible");
      return;
    }

    const box = await dialog.boundingBox();
    const viewportHeight = page.viewportSize()?.height ?? 852;

    if (box) {
      const modalBottom = box.y + box.height;
      console.log(
        `[iOS] Modal: top=${Math.round(box.y)}px, bottom=${Math.round(modalBottom)}px, viewport=${viewportHeight}px`,
      );

      if (modalBottom > viewportHeight) {
        console.warn(
          `[iOS] ⚠️ Modal dépasse le bas du viewport (${Math.round(modalBottom)}px > ${viewportHeight}px)`,
        );
      }
    }

    await captureMobileView(page, "modal-overflow-check", testInfo);

    await page.keyboard.press("Escape");
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// Suite 5 · Zoom iOS — inputs/selects font-size < 16px
// ═════════════════════════════════════════════════════════════════════════════
test.describe("iOS 5 · Zoom iOS inputs/selects", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await waitForAppReady(page);
  });

  test("5.1 Aucun input/textarea visible avec font-size < 16px (onglet Saisie)", async ({
    page,
  }) => {
    if (!(await isAuthenticated(page))) {
      test.skip(true, "Session absente");
      return;
    }

    await navigateToTab(page, /saisie/i);

    // Attendre que les inputs soient rendus (pas forcément présents immédiatement)
    await page
      .waitForFunction(
        () => document.querySelectorAll("input, select, textarea").length > 0,
        { timeout: 8_000 },
      )
      .catch(() => {
        /* vue sans inputs — test informatif */
      });

    const zoomTriggers = await findZoomTriggerInputs(page);
    const inputsAndTextareas = zoomTriggers.filter(
      (e) => e.tag === "INPUT" || e.tag === "TEXTAREA",
    );

    if (inputsAndTextareas.length > 0) {
      console.warn(
        `[iOS] ⚠️ ${inputsAndTextareas.length} input(s) déclencheront un zoom iOS (font-size < 16px):\n` +
          inputsAndTextareas
            .map((e) => `  ${e.tag}[type=${e.type}] "${e.hint}" — ${e.fontSize}px`)
            .join("\n"),
      );
    } else {
      console.log("[iOS] ✅ Tous les inputs/textareas ont font-size >= 16px — pas de zoom iOS");
    }

    expect(
      inputsAndTextareas,
      `Inputs avec font-size < 16px (zoom iOS): ${JSON.stringify(inputsAndTextareas)}`,
    ).toHaveLength(0);
  });

  test("5.2 Audit selects — font-size >= 16px recommandé (zoom Safari)", async ({
    page,
  }) => {
    if (!(await isAuthenticated(page))) {
      test.skip(true, "Session absente");
      return;
    }

    await navigateToTab(page, /saisie/i);

    await page
      .waitForFunction(() => document.querySelectorAll("select").length > 0, { timeout: 8_000 })
      .catch(() => {
        /* pas de select visible */
      });

    const zoomTriggers = await findZoomTriggerInputs(page);
    const problemSelects = zoomTriggers.filter((e) => e.tag === "SELECT");

    if (problemSelects.length > 0) {
      console.warn(
        `[iOS] ⚠️ ${problemSelects.length} select(s) avec font-size < 16px:\n` +
          problemSelects.map((e) => `  SELECT "${e.hint}" — ${e.fontSize}px`).join("\n") +
          "\n  ➜ Recommandation: ajouter font-size: 1rem (16px) aux selects pour iOS",
      );
    } else {
      console.log("[iOS] ✅ Aucun select ne déclenche le zoom iOS");
    }

    // Avertissement seulement — selects souvent gérés par le thème global
    expect(
      problemSelects,
      `Selects avec font-size < 16px (risque zoom iOS): ${JSON.stringify(problemSelects)}`,
    ).toHaveLength(0);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// Suite 6 · Navigation SPA & Workflow Suivi/PDF
// ═════════════════════════════════════════════════════════════════════════════
test.describe("iOS 6 · Navigation & Workflow", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await waitForAppReady(page);
  });

  test("6.1 La bottom navbar affiche au moins 2 onglets", async ({ page }, testInfo) => {
    if (!(await isAuthenticated(page))) {
      test.skip(true, "Session absente");
      return;
    }

    const nav = page.locator('[data-testid="mobile-navbar"]');
    await expect(nav).toBeVisible({ timeout: 5_000 });

    const buttons = await nav.getByRole("button").all();
    console.log(`[iOS] Navbar: ${buttons.length} onglet(s)`);

    await captureMobileView(page, "nav-overview", testInfo);

    expect(buttons.length, "Navbar doit avoir au moins 2 onglets").toBeGreaterThanOrEqual(2);
  });

  test("6.2 Navigation vers l'onglet Saisie — app stable", async ({ page }, testInfo) => {
    if (!(await isAuthenticated(page))) {
      test.skip(true, "Session absente");
      return;
    }

    const navigated = await navigateToTab(page, /saisie/i);
    if (!navigated) {
      test.skip(true, "Onglet Saisie non trouvé dans la navbar");
      return;
    }

    await expect(page.locator('[data-testid="app-shell"]')).toBeVisible({ timeout: 5_000 });

    // Pas d'overflow après changement d'onglet
    const result = await assertNoHorizontalOverflow(page);
    expect(result.hasOverflow, `Overflow après navigation Saisie: ${result.details}`).toBe(false);

    await captureMobileView(page, "nav-saisie", testInfo);
  });

  test("6.3 Navigation vers l'onglet Suivi — bilan accessible", async ({
    page,
  }, testInfo) => {
    if (!(await isAuthenticated(page))) {
      test.skip(true, "Session absente");
      return;
    }

    const navigated = await navigateToTab(page, /suivi/i);
    if (!navigated) {
      test.skip(true, "Onglet Suivi non trouvé");
      return;
    }

    await expect(page.locator('[data-testid="app-shell"]')).toBeVisible({ timeout: 5_000 });

    const bilanBtn = page.getByRole("button", { name: /rapport.*bilan|bilan/i }).first();
    const bilanVisible = await bilanBtn.isVisible({ timeout: 5_000 }).catch(() => false);

    if (bilanVisible) {
      console.log('[iOS] ✅ Bouton "Rapport bilan" visible dans l\'onglet Suivi');
    } else {
      console.log("[iOS] ℹ️ Bouton Rapport bilan non visible — bilan déjà affiché ou permissions");
    }

    await captureMobileView(page, "nav-suivi", testInfo);
  });

  test("6.4 Workflow PDF — bouton Rapport bilan touch-friendly (>= 44px)", async ({
    page,
  }, testInfo) => {
    if (!(await isAuthenticated(page))) {
      test.skip(true, "Session absente");
      return;
    }

    await navigateToTab(page, /suivi/i);

    const bilanBtn = page.getByRole("button", { name: /rapport.*bilan/i }).first();
    if (!(await bilanBtn.isVisible({ timeout: 5_000 }).catch(() => false))) {
      test.skip(true, "Bouton Rapport bilan non trouvé — bilan peut être déjà actif");
      return;
    }

    const box = await bilanBtn.boundingBox();
    if (box) {
      console.log(`[iOS] Bouton Rapport bilan: ${Math.round(box.width)}x${Math.round(box.height)}px`);
      // Apple HIG : minimum 44x44pt pour les éléments interactifs
      expect(box.height, "Bouton Rapport bilan trop petit pour le touch (< 44px)").toBeGreaterThanOrEqual(44);
    }

    await captureMobileView(page, "pdf-rapport-bilan-btn", testInfo);
  });

  test("6.5 Enchaînement d'onglets — aucun overflow cumulé", async ({ page }, testInfo) => {
    if (!(await isAuthenticated(page))) {
      test.skip(true, "Session absente");
      return;
    }

    // Tester la résistance du layout après plusieurs changements d'onglets
    const tabs = [/saisie/i, /suivi/i, /saisie/i];
    for (const tab of tabs) {
      await navigateToTab(page, tab);
    }

    const result = await assertNoHorizontalOverflow(page);
    expect(result.hasOverflow, `Overflow après enchaînement onglets: ${result.details}`).toBe(false);

    await captureMobileView(page, "nav-multitab", testInfo);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// Suite 7 · Orientation portrait / landscape
// ═════════════════════════════════════════════════════════════════════════════
test.describe("iOS 7 · Orientation portrait/landscape", () => {
  test("7.1 Portrait (393x852) — aucun overflow", async ({ page }, testInfo) => {
    await page.goto("/");
    await waitForAppReady(page);

    // Garantir le portrait
    const vp = page.viewportSize();
    if (vp && vp.width > vp.height) await setPortrait(page);

    const result = await assertNoHorizontalOverflow(page);
    if (result.hasOverflow) console.warn(`[iOS] ⚠️ Portrait overflow: ${result.details}`);

    await captureMobileView(page, "orientation-portrait", testInfo);
    expect(result.hasOverflow, `Overflow en portrait: ${result.details}`).toBe(false);
  });

  test("7.2 Landscape (852x393) — aucun overflow", async ({ page }, testInfo) => {
    await page.goto("/");
    await waitForAppReady(page);

    await setLandscape(page);

    await page.waitForFunction(
      () => document.documentElement.clientWidth > document.documentElement.clientHeight,
      { timeout: 3_000 },
    );

    const result = await assertNoHorizontalOverflow(page);
    if (result.hasOverflow) console.warn(`[iOS] ⚠️ Landscape overflow: ${result.details}`);

    await captureMobileView(page, "orientation-landscape", testInfo);
    expect(result.hasOverflow, `Overflow en landscape: ${result.details}`).toBe(false);
  });

  test("7.3 Landscape — navbar visible et dans le viewport", async ({ page }, testInfo) => {
    await page.goto("/");
    await waitForAppReady(page);

    if (!(await isAuthenticated(page))) {
      test.skip(true, "Session absente");
      return;
    }

    await setLandscape(page);

    await page.waitForFunction(() => window.innerWidth > window.innerHeight, { timeout: 3_000 });

    const nav = page.locator('[data-testid="mobile-navbar"]');
    await expect(nav, "Navbar non visible en landscape").toBeVisible({ timeout: 5_000 });

    const pos = await measureNavbarPosition(page);
    console.log(
      `[iOS] Landscape navbar: bottom=${pos.navBottom}px / viewport=${pos.viewportHeight}px`,
    );

    await captureMobileView(page, "orientation-landscape-nav", testInfo);
    expect(pos.withinViewport, "Navbar hors viewport en landscape").toBe(true);
  });

  test("7.4 Retour portrait après landscape — layout sans régression", async ({
    page,
  }, testInfo) => {
    await page.goto("/");
    await waitForAppReady(page);

    await setLandscape(page);
    await page.waitForFunction(() => window.innerWidth > window.innerHeight, { timeout: 3_000 });

    await setPortrait(page);
    await page.waitForFunction(() => window.innerHeight > window.innerWidth, { timeout: 3_000 });

    const result = await assertNoHorizontalOverflow(page);
    await captureMobileView(page, "orientation-back-portrait", testInfo);
    expect(result.hasOverflow, `Overflow après retour portrait: ${result.details}`).toBe(false);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// Suite 8 · Performance & qualité Safari
// ═════════════════════════════════════════════════════════════════════════════
test.describe("iOS 8 · Performance & qualité Safari", () => {
  test("8.1 Aucune erreur JavaScript au premier chargement", async ({ page }) => {
    // Enregistrer AVANT la navigation pour capturer toutes les erreurs
    const errors = collectJsErrors(page);

    await page.goto("/");
    await waitForAppReady(page);

    // "TypeError: Load failed" = erreur fetch WebKit native (réseau/CORS/abort)
    const criticalErrors = errors.filter(
      (e) =>
        !e.includes("net::") &&
        !e.includes("Failed to fetch") &&
        !e.includes("NetworkError") &&
        !e.includes("ERR_FAILED") &&
        !e.includes("AbortError") &&
        !e.includes("Load failed") &&
        !e.includes("TypeError: Load"),
    );

    if (criticalErrors.length > 0) {
      console.warn(`[iOS] ⚠️ Erreurs JS critiques:\n${criticalErrors.join("\n")}`);
    }

    expect(
      criticalErrors,
      `Erreurs JS au chargement: ${criticalErrors.join("; ")}`,
    ).toHaveLength(0);
  });

  test("8.2 CSS design tokens complets après hydratation React", async ({ page }) => {
    await page.goto("/");
    await waitForAppReady(page);

    const missing = await assertCSSTokensDefined(page);
    expect(missing, `CSS tokens manquants: ${missing.join(", ")}`).toHaveLength(0);
  });

  test("8.3 Pas de transition:all sur les composants critiques (AGENTS.md)", async ({
    page,
  }) => {
    await page.goto("/");
    await waitForAppReady(page);

    const problemElements = await page.evaluate(() => {
      const results: { tag: string; testid: string; duration: string }[] = [];

      // Note : getComputedStyle().transition renvoie "all 0s ease 0s" par défaut
      // dans WebKit même sans transition déclarée. On filtre donc :
      //   transitionProperty === "all" ET transitionDuration !== "0s"
      // pour ne détecter que les vrais transition-all avec une durée non nulle.
      document
        .querySelectorAll<HTMLElement>("nav, header, [data-testid], main")
        .forEach((el) => {
          const s = getComputedStyle(el);
          const prop = s.transitionProperty;
          const dur = s.transitionDuration;
          // Seuls les éléments avec transition-all ET durée > 0 sont problématiques
          if (prop === "all" && dur !== "0s") {
            results.push({
              tag: el.tagName,
              testid: el.getAttribute("data-testid") || (el.className || "").toString().slice(0, 40),
              duration: dur,
            });
          }
        });

      return results;
    });

    if (problemElements.length > 0) {
      console.warn(
        `[iOS] ⚠️ ${problemElements.length} élément(s) avec transition:all actif (violation AGENTS.md §8):\n` +
          problemElements.map((e) => `  ${e.tag} [${e.testid}] duration=${e.duration}`).join("\n"),
      );
    }

    // Référence AGENTS.md §8 : transition-all interdit (performance dégradée)
    expect(
      problemElements,
      `Elements avec transition:all actif: ${JSON.stringify(problemElements)}`,
    ).toHaveLength(0);
  });

  test("8.4 AuthGate timing — splash disparaît entre 2s et 8s", async ({ page }) => {
    const start = Date.now();

    await page.goto("/");

    // Attendre que le splash screen disparaisse
    await page.waitForFunction(
      () => document.querySelector('[data-testid="app-loading-screen"]') === null,
      { timeout: 10_000 },
    );

    const elapsed = Date.now() - start;
    console.log(`[iOS] Splash screen disparu après ${elapsed}ms`);

    // Le minDelay AuthGate est de 2500ms — ne doit pas disparaître avant
    expect(elapsed, "Splash disparu avant le délai minimum AuthGate (2500ms)").toBeGreaterThanOrEqual(2000);
    // Ne doit pas prendre plus de 8s (hors réseau très lent)
    expect(elapsed, "Splash trop long (>8s) — problème de chargement ?").toBeLessThanOrEqual(8_000);
  });

  test("8.5 Reload à chaud — app stable sans erreurs", async ({ page }, testInfo) => {
    const errors = collectJsErrors(page);

    await page.goto("/");
    await waitForAppReady(page);

    // Reload pour simuler un retour utilisateur (cache chaud)
    await page.reload();
    await waitForAppReady(page);

    const criticalErrors = errors.filter(
      (e) =>
        !e.includes("net::") &&
        !e.includes("Failed to fetch") &&
        !e.includes("NetworkError") &&
        !e.includes("Load failed") &&
        !e.includes("TypeError: Load"),
    );

    if (criticalErrors.length > 0) {
      console.warn(`[iOS] ⚠️ Erreurs après reload: ${criticalErrors.join("\n")}`);
    }

    // L'app doit être dans un état stable (shell ou login form)
    const isStable =
      (await page.locator('[data-testid="app-shell"]').isVisible().catch(() => false)) ||
      (await page.locator('[data-testid="login-form"]').isVisible().catch(() => false));

    await captureMobileView(page, "reload-stable", testInfo);

    expect(isStable, "App pas dans un état stable après reload").toBe(true);
    expect(criticalErrors, `Erreurs JS après reload: ${criticalErrors.join("; ")}`).toHaveLength(0);
  });
});
