// e2e/helpers/ios.ts
// ─────────────────────────────────────────────────────────────────────────────
// Helpers dédiés aux tests iOS/WebKit — heuregeo
//
// Fonctions utilitaires pour :
//   • Navigation SPA via la bottom navbar
//   • Détection overflow horizontal
//   • Vérification CSS tokens (design system)
//   • Audit glass/backdrop-filter WebKit
//   • Détection inputs déclenchant le zoom iOS (font-size < 16px)
//   • Mesure de la position de la navbar (safe-area)
//   • Collecte erreurs JS pendant le chargement
//   • Simulation orientation portrait / landscape
//
// Règles respectées :
//   • 0 waitForTimeout() — uniquement waitForFunction() et expect()
//   • Compatible AGENTS.md (CSS vars, 4 thèmes, design system)
// ─────────────────────────────────────────────────────────────────────────────

import { type Page } from "@playwright/test";

/**
 * Navigate to a tab in the mobile bottom navbar (SPA — no URL change).
 * Returns false if the navbar or the target tab is not found.
 */
export async function navigateToTab(
  page: Page,
  label: string | RegExp,
): Promise<boolean> {
  const nav = page.locator('[data-testid="mobile-navbar"]');
  if (!(await nav.isVisible({ timeout: 5_000 }).catch(() => false))) return false;

  const pattern = typeof label === "string" ? new RegExp(label, "i") : label;
  const btn = nav.getByRole("button", { name: pattern });
  if (!(await btn.isVisible({ timeout: 3_000 }).catch(() => false))) return false;

  await btn.click();

  // Two animation-frame cycles to let React flush the tab switch re-render
  await page.evaluate(
    () =>
      new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(r))),
  );

  return true;
}

/**
 * Check for horizontal overflow at document level.
 * Returns hasOverflow=true if document.scrollWidth > clientWidth.
 */
export async function assertNoHorizontalOverflow(
  page: Page,
): Promise<{ hasOverflow: boolean; details: string }> {
  const result = await page.evaluate(() => {
    const bodyWidth = document.documentElement.clientWidth;
    const scrollWidth = document.documentElement.scrollWidth;

    // Collect up to 5 elements that protrude beyond the viewport
    const offending: { tag: string; cls: string; right: number }[] = [];
    document.querySelectorAll<HTMLElement>("*").forEach((el) => {
      const rect = el.getBoundingClientRect();
      if (rect.right > bodyWidth + 2) {
        offending.push({
          tag: el.tagName,
          cls: (el.className || "").toString().slice(0, 50),
          right: Math.round(rect.right),
        });
      }
    });

    return {
      hasOverflow: scrollWidth > bodyWidth,
      bodyWidth,
      scrollWidth,
      offending: offending.slice(0, 5),
    };
  });

  return {
    hasOverflow: result.hasOverflow,
    details: result.hasOverflow
      ? `scrollWidth=${result.scrollWidth}px > bodyWidth=${result.bodyWidth}px. Offending: ${JSON.stringify(result.offending)}`
      : "no overflow",
  };
}

/**
 * Verify that the core CSS design tokens are defined on :root.
 * Returns an array of missing token names.
 */
export async function assertCSSTokensDefined(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const style = getComputedStyle(document.documentElement);
    const tokens = [
      "--color-bg",
      "--color-surface",
      "--color-text",
      "--color-accent-violet",
      "--color-border",
    ];
    return tokens.filter((t) => !style.getPropertyValue(t).trim());
  });
}

/**
 * Check that the mobile navbar glass div uses backdrop-filter blur.
 * Covers the `-webkit-backdrop-filter` vendor prefix used by WebKit/Safari.
 */
export async function checkNavbarGlass(
  page: Page,
): Promise<{ hasGlass: boolean; filterValue: string }> {
  return page.evaluate(() => {
    const nav = document.querySelector('[data-testid="mobile-navbar"]');
    if (!nav) return { hasGlass: false, filterValue: "nav not found" };

    const glass = nav.querySelector("div");
    if (!glass) return { hasGlass: false, filterValue: "glass div not found" };

    const s = getComputedStyle(glass);
    // WebKit exposes both properties
    const wkFilter = (s as CSSStyleDeclaration & { webkitBackdropFilter?: string })
      .webkitBackdropFilter;
    const f = s.backdropFilter || wkFilter || "";
    return { hasGlass: f.toLowerCase().includes("blur"), filterValue: f };
  });
}

/**
 * Find all visible <input>, <select>, <textarea> elements whose computed
 * font-size is below 16px — these trigger automatic zoom on iOS Safari.
 */
export async function findZoomTriggerInputs(
  page: Page,
): Promise<Array<{ tag: string; type: string; fontSize: number; hint: string }>> {
  return page.evaluate(() => {
    return Array.from(
      document.querySelectorAll<HTMLInputElement>("input, select, textarea"),
    )
      .filter((el) => {
        const r = el.getBoundingClientRect();
        return r.width > 0 && r.height > 0;
      })
      .map((el) => ({
        tag: el.tagName,
        type: el.type || el.tagName.toLowerCase(),
        fontSize: Math.round(parseFloat(getComputedStyle(el).fontSize)),
        hint: (
          el.placeholder ||
          el.getAttribute("aria-label") ||
          el.name ||
          el.id ||
          ""
        ).slice(0, 30),
      }))
      .filter(({ fontSize }) => fontSize < 16);
  });
}

/**
 * Measure the navbar position in the viewport.
 * On iPhone 15, the home indicator is ~34px — navBottom should be <= viewportHeight.
 */
export async function measureNavbarPosition(page: Page): Promise<{
  navBottom: number;
  viewportHeight: number;
  fromBottom: number;
  withinViewport: boolean;
}> {
  return page.evaluate(() => {
    const nav = document.querySelector('[data-testid="mobile-navbar"]');
    if (!nav) {
      return {
        navBottom: 0,
        viewportHeight: window.innerHeight,
        fromBottom: 0,
        withinViewport: false,
      };
    }
    const rect = nav.getBoundingClientRect();
    const h = window.innerHeight;
    return {
      navBottom: Math.round(rect.bottom),
      viewportHeight: h,
      fromBottom: Math.round(h - rect.bottom),
      withinViewport: rect.bottom <= h,
    };
  });
}

/** Patterns d'erreurs non critiques à filtrer (réseau, auth invité, etc.) */
const NON_CRITICAL_PATTERNS = [
  /ERR_FAILED|ERR_CONNECTION|ERR_NAME_NOT_RESOLVED/i,
  /net::ERR/i,
  /Failed to fetch/i,
  /NetworkError/i,
  // Logs réseau bas niveau du navigateur (statut HTTP). En CI l'app tourne souvent en
  // mode invité (pas de session owner valide) : les endpoints protégés renvoient 401/403.
  /Failed to load resource/i,
  /\b40[13]\b|Forbidden|Unauthorized/i,
  /favicon/i,
  /ResizeObserver loop/i,
  /Loading chunk/i,
  /ChunkLoadError/i,
  /supabase/i,
  /realtime/i,
];

/**
 * Indique si un message d'erreur est non critique (bruit) et doit être ignoré.
 * Couvre aussi les messages vides et les valeurs non-stringifiables ("[object Object]",
 * typiquement un objet jeté brut sous WebKit) qui n'apportent aucun signal de debug.
 */
function isNonCriticalError(message: string): boolean {
  const text = (message ?? "").trim();
  if (!text || text === "[object Object]") return true;
  return NON_CRITICAL_PATTERNS.some((p) => p.test(text));
}

/**
 * Register page-error and console-error listeners BEFORE page.goto().
 * Returns a reference array that fills as errors occur during the session.
 * Filtre le bruit réseau (ERR_FAILED, 401/403, Failed to load resource, etc.) et
 * ignore les valeurs non-stringifiables ("[object Object]") pour isoler les vraies
 * erreurs JS applicatives.
 */
export function collectJsErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("pageerror", (err) => {
    const message = err?.message || String(err ?? "");
    if (!isNonCriticalError(message)) errors.push(`[pageerror] ${message}`);
  });
  page.on("console", (msg) => {
    if (msg.type() === "error") {
      const text = msg.text();
      if (!isNonCriticalError(text)) errors.push(`[console.error] ${text}`);
    }
  });
  return errors;
}

/**
 * Simulate landscape orientation by swapping viewport width / height.
 */
export async function setLandscape(page: Page): Promise<void> {
  const vp = page.viewportSize();
  if (!vp || vp.width > vp.height) return; // already landscape
  await page.setViewportSize({ width: vp.height, height: vp.width });
}

/**
 * Restore portrait orientation (swap back width / height if currently landscape).
 */
export async function setPortrait(page: Page): Promise<void> {
  const vp = page.viewportSize();
  if (!vp || vp.height > vp.width) return; // already portrait
  await page.setViewportSize({ width: vp.height, height: vp.width });
}
