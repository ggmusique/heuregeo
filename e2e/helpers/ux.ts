// e2e/helpers/ux.ts
// ─────────────────────────────────────────────────────────────────────────────
// Helpers UX / Navigation — heuregeo
//
// Fonctions réutilisables pour tester la navigation et la qualité UX :
//   • clickNavTab()          : clic onglet navbar + vérification état actif
//   • assertNavTabActive()   : vérification état actif d'un onglet
//   • assertPageResponsive() : vérification que la page ne s'est pas gelée
//   • assertNoOverflow()     : vérification absence overflow horizontal
//   • assertModalLifecycle() : ouverture → verification → fermeture propre
//   • collectRuntimeErrors() : collecte d'erreurs JS runtime (non réseau)
//   • assertNoRuntimeErrors(): assertion 0 erreur critique
//   • auditButtons()         : audit accessibilité des boutons visibles
//
// Règles :
//   • 0 waitForTimeout() — expect() et waitForFunction() uniquement
//   • Compatible AGENTS.md (CSS vars, 4 thèmes, design system)
//   • L'état actif d'un onglet = className contient "text-white"
//     (valable pour le mode pro et le mode non-pro d'AppNavBar)
// ─────────────────────────────────────────────────────────────────────────────

import { type Page, expect } from "@playwright/test";

// ── Navigation navbar ─────────────────────────────────────────────────────────

/**
 * Clique sur un onglet de la navbar mobile (data-testid="mobile-navbar")
 * et attend que React flush la mise à jour d'état.
 *
 * L'état actif = le bouton gagne la classe "text-white" (gradient actif).
 * Valable pour les deux modes de rendu (pro / non-pro) d'AppNavBar.
 *
 * Retourne { clicked: false } si l'onglet n'est pas visible (permission absente).
 */
export async function clickNavTab(
  page: Page,
  tabLabel: string | RegExp,
): Promise<{ clicked: boolean; became_active: boolean }> {
  const nav = page.locator('[data-testid="mobile-navbar"]');
  const btn = nav.getByRole("button", { name: tabLabel });

  const visible = await btn.isVisible({ timeout: 3_000 }).catch(() => false);
  if (!visible) return { clicked: false, became_active: false };

  await btn.click();

  // 2 cycles rAF pour laisser React flush le changement d'état
  await page.evaluate(
    () => new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(r))),
  );

  const became_active = await btn
    .evaluate((el) => el.className.includes("text-white"))
    .catch(() => false);

  return { clicked: true, became_active };
}

/**
 * Vérifie qu'un onglet navbar est dans l'état actif (className contient "text-white").
 * Retourne false si l'onglet n'est pas trouvé.
 */
export async function assertNavTabActive(
  page: Page,
  tabLabel: string | RegExp,
): Promise<boolean> {
  const nav = page.locator('[data-testid="mobile-navbar"]');
  const btn = nav.getByRole("button", { name: tabLabel });

  if (!(await btn.isVisible({ timeout: 3_000 }).catch(() => false))) return false;

  return btn.evaluate((el) => el.className.includes("text-white")).catch(() => false);
}

// ── Santé de la page ──────────────────────────────────────────────────────────

/**
 * Vérifie que la page répond toujours (app-shell visible, pas de gel React).
 */
export async function assertPageResponsive(page: Page): Promise<void> {
  const hasShell = await page
    .locator('[data-testid="app-shell"]')
    .isVisible({ timeout: 3_000 })
    .catch(() => false);
  expect(hasShell, "app-shell disparu — page potentiellement gelée ou écran blanc").toBe(true);
}

/**
 * Vérifie l'absence d'overflow horizontal (scrollWidth > clientWidth).
 */
export async function assertNoOverflow(
  page: Page,
): Promise<{ ok: boolean; delta: number }> {
  const result = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  return {
    ok: result.scrollWidth <= result.clientWidth,
    delta: result.scrollWidth - result.clientWidth,
  };
}

// ── Modals ────────────────────────────────────────────────────────────────────

/**
 * Cycle complet de vie d'une modale :
 *   1. Exécute l'action d'ouverture
 *   2. Vérifie que le heading est visible (modal ouverte)
 *   3. Clique sur le bouton Annuler / Fermer
 *   4. Vérifie que le heading a disparu (modal fermée proprement)
 *
 * Retourne true si tout s'est passé correctement, false si la modal
 * n'a pas pu s'ouvrir (bouton introuvable, permission absente, etc.).
 */
export async function assertModalLifecycle(
  page: Page,
  openAction: () => Promise<void>,
  options: {
    /** Texte ou regex identifiant le heading unique de la modal. */
    headingMatcher: string | RegExp;
    /** Pattern du bouton de fermeture. Défaut : /annuler|fermer/i */
    closePattern?: RegExp;
  },
): Promise<boolean> {
  const { headingMatcher, closePattern = /annuler|fermer/i } = options;

  await openAction();

  const heading = page.getByText(headingMatcher).first();
  const opened = await heading.isVisible({ timeout: 6_000 }).catch(() => false);
  if (!opened) return false;

  // Chercher le bouton de fermeture DANS l'overlay modal (class fixed+inset-0)
  // pour éviter de sélectionner des boutons derrière la modal (ex: MissionForm "Annuler"
  // qui est hors viewport et provoquerait un scroll-hang sur WebKit/Windows).
  const closeBtn = page
    .locator('[class*="fixed"][class*="inset-0"] button')
    .filter({ hasText: closePattern })
    .first();

  if (await closeBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
    await closeBtn.click();
  } else {
    // Fallback : Escape (compatible desktop et certains setups iOS)
    await page.keyboard.press("Escape");
  }

  await expect(heading).not.toBeVisible({ timeout: 5_000 });
  return true;
}

// ── Erreurs JS runtime ────────────────────────────────────────────────────────

/** Patterns d'erreurs non critiques à filtrer (réseau, extensions, etc.) */
const NON_CRITICAL_PATTERNS = [
  /ERR_FAILED|ERR_CONNECTION|ERR_NAME_NOT_RESOLVED/i,
  /net::ERR/i,
  /Failed to fetch/i,
  /NetworkError/i,
  /favicon/i,
  /ResizeObserver loop/i,
  /Loading chunk/i,
  /ChunkLoadError/i,
  /supabase/i,
  /realtime/i,
];

/**
 * Installe les listeners pageerror + console.error AVANT page.goto().
 * Filtre les erreurs réseau et les erreurs non critiques (Supabase realtime, etc.).
 *
 * Le tableau retourné se remplit dynamiquement au fil de la session.
 */
export function collectRuntimeErrors(page: Page): string[] {
  const errors: string[] = [];

  page.on("pageerror", (err) => {
    if (!NON_CRITICAL_PATTERNS.some((p) => p.test(err.message))) {
      errors.push(`[pageerror] ${err.message}`);
    }
  });

  page.on("console", (msg) => {
    if (msg.type() === "error") {
      const text = msg.text();
      if (!NON_CRITICAL_PATTERNS.some((p) => p.test(text))) {
        errors.push(`[console.error] ${text}`);
      }
    }
  });

  return errors;
}

/**
 * Vérifie qu'aucune erreur runtime critique n'a été collectée.
 * Logue les erreurs si présentes pour faciliter le debug.
 */
export function assertNoRuntimeErrors(errors: string[], context = ""): void {
  if (errors.length > 0) {
    console.warn(
      `[UX] Erreurs runtime${context ? ` (${context})` : ""}:\n${errors.join("\n")}`,
    );
  }
  expect(
    errors,
    `Erreurs JS runtime critiques détectées${context ? ` sur : ${context}` : ""}`,
  ).toHaveLength(0);
}

// ── Audit accessibilité boutons ───────────────────────────────────────────────

export interface ButtonAuditResult {
  total: number;
  tooSmall: number;
  outOfViewport: number;
  issues: Array<{ text: string; width: number; height: number; reason: string }>;
}

/**
 * Audite tous les boutons visibles sur la page courante.
 * Détecte : trop petits (< minSize px sur au moins un axe), hors viewport.
 *
 * Paramètre minSize : taille minimale en px (défaut 24px — seuil technique,
 * 44px est le seuil Apple recommandé pour le touch).
 */
export async function auditButtons(
  page: Page,
  options: { minSize?: number } = {},
): Promise<ButtonAuditResult> {
  const { minSize = 24 } = options;

  return page.evaluate((min: number) => {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const buttons = Array.from(document.querySelectorAll<HTMLButtonElement>("button"));
    const issues: Array<{ text: string; width: number; height: number; reason: string }> = [];
    let total = 0;
    let tooSmall = 0;
    let outOfViewport = 0;

    for (const btn of buttons) {
      const rect = btn.getBoundingClientRect();
      // Ignorer les boutons complètement invisibles (display:none, etc.)
      if (rect.width === 0 && rect.height === 0) continue;
      total++;

      const text = (btn.textContent ?? btn.getAttribute("aria-label") ?? "")
        .trim()
        .slice(0, 40);
      const reasons: string[] = [];

      if (Math.min(rect.width, rect.height) < min) {
        tooSmall++;
        reasons.push(`trop petit (${Math.round(rect.width)}×${Math.round(rect.height)}px)`);
      }
      if (rect.bottom < 0 || rect.top > vh || rect.right < 0 || rect.left > vw) {
        outOfViewport++;
        reasons.push("hors viewport");
      }
      if (reasons.length > 0) {
        issues.push({
          text,
          width: Math.round(rect.width),
          height: Math.round(rect.height),
          reason: reasons.join(", "),
        });
      }
    }

    return { total, tooSmall, outOfViewport, issues };
  }, minSize);
}
