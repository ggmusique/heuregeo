// e2e/helpers/visual.ts
// ─────────────────────────────────────────────────────────────────────────────
// Helpers pour les tests de régression visuelle.
//
// Stratégie anti-flakiness :
//   1. Désactiver toutes les animations CSS via injection de style
//   2. Attendre les web fonts (document.fonts.ready)
//   3. Attendre la stabilité réseau (tolérant — Supabase realtime reste ouvert)
//   4. Masquer le contenu dynamique (données de mission, dates, KPI)
//
// Utilisation type dans un test :
//   await page.goto("/");
//   await waitForAppReady(page);
//   await switchTheme(page, "oled");
//   await expect(page).toHaveScreenshot("shell-oled.png", { mask: shellMasks(page) });
// ─────────────────────────────────────────────────────────────────────────────

import { type Page, type Locator } from "@playwright/test";
import { waitForAppReady } from "./navigation";

export type Theme = "neon" | "oled" | "emerald" | "arctic";

// ── Animations ────────────────────────────────────────────────────────────────

/**
 * Injecte du CSS pour figer toutes les animations et transitions.
 * Indispensable pour des screenshots pixel-stables.
 *
 * Utilise 0.001ms (≠ 0) pour éviter les edge cases de certains moteurs CSS
 * qui ignorent animation-duration: 0.
 */
export async function freezeAnimations(page: Page): Promise<void> {
  await page.addStyleTag({
    content: `
      *, *::before, *::after {
        animation-duration: 0.001ms !important;
        animation-delay: 0ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.001ms !important;
        transition-delay: 0ms !important;
        scroll-behavior: auto !important;
        caret-color: transparent !important;
      }
    `,
  });
}

// ── Fonts ─────────────────────────────────────────────────────────────────────

/**
 * Attend que les web fonts soient intégralement chargées.
 * Prévient le FOUT (Flash Of Unstyled Text) dans les screenshots.
 */
export async function waitForFonts(page: Page): Promise<void> {
  await page.evaluate(() => document.fonts.ready);
}

// ── Stabilisation complète ────────────────────────────────────────────────────

/**
 * Séquence complète de stabilisation avant un screenshot :
 *   - Animations figées
 *   - Fonts chargées
 *   - Réseau idle (tolérant : Supabase realtime maintient une WS ouverte)
 */
export async function stabilizeForScreenshot(page: Page): Promise<void> {
  await freezeAnimations(page);
  await waitForFonts(page);
  await page
    .waitForLoadState("networkidle")
    .catch(() => {
      // Les connexions Supabase realtime empêchent networkidle — on ignore.
    });
}

// ── Thème ─────────────────────────────────────────────────────────────────────

/**
 * Bascule vers un thème via localStorage et recharge la page.
 * Attend la readiness de l'app + la stabilisation complète.
 *
 * Le thème est appliqué via CSS vars sur :root.
 * storageState "owner.json" contient app-theme=neon par défaut.
 */
export async function switchTheme(page: Page, theme: Theme): Promise<void> {
  await page.evaluate((t) => localStorage.setItem("app-theme", t), theme);
  await page.reload();
  await waitForAppReady(page);
  await stabilizeForScreenshot(page);
}

// ── État login ────────────────────────────────────────────────────────────────

/**
 * Navigue vers la page principale sans session et attend le formulaire de login.
 * À utiliser avec le projet "visual-login" (sans storageState).
 */
export async function goToLoginForm(page: Page): Promise<void> {
  await page.goto("/");
  // Le splash AuthGate disparaît après ~2500ms
  await page
    .locator('[data-testid="app-loading-screen"]')
    .waitFor({ state: "hidden", timeout: 15_000 });
  // Le formulaire de login apparaît ensuite
  await page
    .locator('[data-testid="login-form"]')
    .waitFor({ state: "visible", timeout: 8_000 });
  await stabilizeForScreenshot(page);
}

// ── Masques de contenu dynamique ──────────────────────────────────────────────

/**
 * Masques pour les screenshots de shell complet.
 * Cache le header (heure live, date, version = dynamiques) ET le <main>
 * (données de mission, KPI). Ne reste visible que : background thème + navbar.
 *
 * → Idéal pour détecter : position navbar, fond de thème (--color-bg), overflow.
 */
export function shellMasks(page: Page): Locator[] {
  return [
    // Header — contient l'heure live, la date courante et le numéro de version
    page.locator("header"),
    // Contenu principal — données dynamiques (missions, KPI, dates)
    page.locator("main"),
  ];
}

/**
 * Masques minimaux pour les screenshots de composants individuels.
 * À utiliser quand un composant n'affiche pas de données dynamiques.
 */
export function componentMasks(_page: Page): Locator[] {
  return [];
}
