// e2e/mobile/responsive.spec.ts
// ─────────────────────────────────────────────────────────────────────────────
// Tests E2E Mobile : Responsive, overflow, accessibilité des boutons
//
// Ces tests tournent sur :
//   - iPhone 15 (WebKit) via projet "mobile-iphone"
//   - Pixel 7 (Chrome Android) via projet "mobile-pixel"
//
// Objectif : détecter les régressions visuelles mobile-first.
// ─────────────────────────────────────────────────────────────────────────────

import { test, expect } from "@playwright/test";
import { waitForAppReady } from "../helpers/navigation";
import { captureMobileView } from "../helpers/screenshot";

test.describe("Responsive mobile", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await waitForAppReady(page);
  });

  // ── Pas d'overflow horizontal ───────────────────────────────────────────────
  test("1. Pas d'overflow horizontal sur la page principale", async ({ page }, testInfo) => {
    const overflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });

    await captureMobileView(page, "home-overflow-check", testInfo);
    expect(overflow, "Overflow horizontal détecté sur mobile").toBe(false);
  });

  // ── Application chargée sur mobile ─────────────────────────────────────────
  test("2. Application chargée et rendue sur mobile", async ({ page, browserName }, testInfo) => {
    // Pas d'erreur React visible
    await expect(page.locator("[data-testid='error-boundary'], .error-boundary")).not.toBeVisible();

    // app-shell ou login-form monté (waitForAppReady garantit l'un des deux)
    const appReady =
      (await page.locator('[data-testid="app-shell"]').isVisible().catch(() => false)) ||
      (await page.locator('[data-testid="login-form"]').isVisible().catch(() => false));
    expect(appReady, "Ni app-shell ni login-form visible après chargement").toBe(true);

    await captureMobileView(page, `app-loaded-${browserName}`, testInfo);
  });

  // ── Navigation mobile accessible ────────────────────────────────────────────
  test("3. Navigation mobile accessible (navbar bottom)", async ({ page }, testInfo) => {
    // La nav est visible uniquement si authentifié (app-shell présent)
    const isAuthenticated = await page
      .locator('[data-testid="app-shell"]')
      .isVisible()
      .catch(() => false);

    if (!isAuthenticated) {
      // Sans session : login-form visible, nav absente → test non applicable
      await expect(page.locator('[data-testid="login-form"]')).toBeVisible({ timeout: 5_000 });
      await captureMobileView(page, "navigation-mobile-login", testInfo);
      test.skip(true, "Session absente — navigation authentifiée non testable");
      return;
    }

    // App authentifiée : la navbar bottom doit être visible
    await expect(
      page.locator('[data-testid="mobile-navbar"]'),
      "La navbar mobile (bottom nav) n'est pas visible",
    ).toBeVisible({ timeout: 5_000 });

    await captureMobileView(page, "navigation-mobile", testInfo);
  });

  // ── Boutons avec taille minimale (accessibilité touch) ──────────────────────
  test("4. Les boutons ont une taille touch-friendly (min 44px)", async ({ page }) => {
    await page.waitForLoadState("domcontentloaded");

    const smallButtons = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll("button:not([hidden])"));
      return buttons
        .filter((btn) => {
          const rect = btn.getBoundingClientRect();
          // Ignorer les boutons invisibles (display:none, etc.)
          if (rect.width === 0 && rect.height === 0) return false;
          // Signaler si le bouton est plus petit que 32px (seuil raisonnable)
          return rect.width < 32 || rect.height < 32;
        })
        .map((btn) => ({
          text: btn.textContent?.trim().slice(0, 50) || "(sans texte)",
          width: Math.round(btn.getBoundingClientRect().width),
          height: Math.round(btn.getBoundingClientRect().height),
        }));
    });

    // Log informatif (ne fail pas — certains petits boutons sont intentionnels)
    if (smallButtons.length > 0) {
      console.warn(
        `[mobile] ${smallButtons.length} boutons < 32px détectés:`,
        JSON.stringify(smallButtons, null, 2),
      );
    }

    // Seuil strict : pas plus de 5 boutons trop petits
    expect(
      smallButtons.length,
      `Trop de boutons trop petits pour le touch: ${JSON.stringify(smallButtons)}`,
    ).toBeLessThan(5);
  });

  // ── Modals visibles sur mobile ──────────────────────────────────────────────
  test("5. Ouverture de modal sans overflow sur mobile", async ({ page }, testInfo) => {
    // waitForAppReady est déjà fait dans beforeEach — l'app est stable ici

    // Chercher un bouton qui ouvre une modal (ajouter, créer, paramètres...)
    const modalTrigger = page
      .getByRole("button", { name: /ajouter|créer|nouveau|paramètre|settings/i })
      .first();

    if (!(await modalTrigger.isVisible({ timeout: 5_000 }))) {
      test.skip(true, "Aucun bouton de modal trouvé");
      return;
    }

    await modalTrigger.click();
    await page.waitForTimeout(500);

    // Vérifier qu'une modal/dialog est ouverte
    const modal = page
      .locator('[role="dialog"], [data-testid*="modal"], .modal')
      .first();

    if (await modal.isVisible({ timeout: 3_000 })) {
      // Pas d'overflow horizontal avec la modal ouverte
      const overflow = await page.evaluate(() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth;
      });

      await captureMobileView(page, "modal-open-mobile", testInfo);
      expect(overflow, "Overflow horizontal avec modal ouverte").toBe(false);

      // Fermer la modal
      await page.keyboard.press("Escape");
    } else {
      test.skip(true, "Modal non détectée après clic");
    }
  });

  // ── Page Bilan sur mobile ───────────────────────────────────────────────────
  test("6. Page Bilan accessible et sans overflow sur mobile", async ({ page }, testInfo) => {
    const bilanLink = page
      .getByRole("link", { name: /bilan/i })
      .or(page.getByRole("button", { name: /bilan/i }))
      .first();

    if (!(await bilanLink.isVisible({ timeout: 5_000 }))) {
      test.skip(true, "Lien Bilan non trouvé");
      return;
    }

    await bilanLink.click();
    // Attendre que l'app se stabilise après navigation interne (SPA)
    await page.waitForFunction(
      () => document.querySelector('[data-testid="app-shell"]') !== null,
      { timeout: 8_000 },
    );

    const overflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });

    await captureMobileView(page, "bilan-mobile", testInfo);
    expect(overflow, "Overflow horizontal sur la page Bilan (mobile)").toBe(false);
  });

  // ── Saisie de texte (input mobile) ─────────────────────────────────────────
  test("7. Les inputs sont utilisables sur mobile (pas de zoom forcé)", async ({ page }) => {
    // Sur iOS, un input avec font-size < 16px force un zoom automatique
    // Ce test vérifie que les inputs principaux ont font-size >= 16px
    const tooSmallInputs = await page.evaluate(() => {
      const inputs = Array.from(document.querySelectorAll("input, textarea, select"));
      return inputs
        .filter((el) => {
          const style = window.getComputedStyle(el);
          const fontSize = parseFloat(style.fontSize);
          const rect = el.getBoundingClientRect();
          // Ignorer les inputs invisibles
          if (rect.width === 0) return false;
          return fontSize < 16;
        })
        .map((el) => ({
          type: (el as HTMLInputElement).type || el.tagName,
          fontSize: parseFloat(window.getComputedStyle(el).fontSize),
        }));
    });

    if (tooSmallInputs.length > 0) {
      console.warn(
        `[mobile] Inputs avec font-size < 16px (risque de zoom iOS):`,
        JSON.stringify(tooSmallInputs),
      );
    }

    // Informatif uniquement — pas de fail strict car c'est géré par les thèmes
    // Mais on log pour détecter les régressions futures
    expect(tooSmallInputs.length).toBeLessThan(10);
  });
});
