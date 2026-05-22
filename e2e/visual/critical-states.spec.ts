// e2e/visual/critical-states.spec.ts
// ─────────────────────────────────────────────────────────────────────────────
// Tests visuels — États critiques non-authentifiés
//
// Projet : visual-login (playwright.visual.config.ts)
// Pas de storageState → l'app se charge sans session → splash → login form
//
// Snapshots générés :
//   login-form.png          — Formulaire de connexion (email + password + CTA)
//   login-form-focus.png    — Champ email en focus (indicateur focus visible)
//
// Ce qu'on teste :
//   - Apparence du formulaire de connexion (layout, typo, boutons, inputs)
//   - Cohérence avec le design system (surfaces glass, accents, spacing)
//   - Accessibilité visuelle (label + placeholder + focus ring)
//   - Rendu stable après la fin du splash AuthGate (2500ms minDelay)
// ─────────────────────────────────────────────────────────────────────────────

import { test, expect } from "@playwright/test";
import { goToLoginForm } from "../helpers/visual";

// ── Formulaire de login ───────────────────────────────────────────────────────

test.describe("Login form — État non-authentifié", () => {
  test("Formulaire de connexion — état initial", async ({ page }) => {
    await goToLoginForm(page);

    const form = page.locator('[data-testid="login-form"]');
    await expect(form).toBeVisible();

    // Screenshot du formulaire seul — contenu entièrement statique
    await expect(form).toHaveScreenshot("login-form.png");
  });

  test("Formulaire de connexion — page complète", async ({ page }) => {
    await goToLoginForm(page);

    // Screenshot de toute la page (background + form centré)
    // Détecte : bg-color thème, centrage, marges, shadow card
    await expect(page).toHaveScreenshot("login-page.png", {
      fullPage: false,
    });
  });

  test("Formulaire de connexion — champ email en focus", async ({ page }) => {
    await goToLoginForm(page);

    // Focus sur le premier champ email pour vérifier le focus ring
    const emailInput = page
      .locator('[data-testid="login-form"]')
      .locator('input[type="email"]');
    await emailInput.focus();

    // Stabiliser après focus (pas d'animation de focus ring)
    await page.evaluate(() => document.fonts.ready);

    const form = page.locator('[data-testid="login-form"]');
    await expect(form).toHaveScreenshot("login-form-focus.png");
  });
});
