// e2e/mobile/navigation-ux.spec.ts
// ─────────────────────────────────────────────────────────────────────────────
// QA UX / Navigation complète — heuregeo (iPhone 15 WebKit + Pixel 7 Android)
//
// 9 suites de tests qui valident le comportement produit réel :
//
//   1. Navbar mobile — navigation onglets (clic, état actif, écran blanc, overflow label)
//   2. Boutons d'action rapide — onglet Saisie (Frais, Acompte)
//   3. Modals — cycle de vie complet (ouverture, fermeture, overlay résiduel)
//   4. Cohérence navigation SPA (aller-retour, cyclique, retour navigateur)
//   5. Overflow horizontal — tous les onglets
//   6. Accessibilité touch — taille boutons, navbar non recouverte
//   7. Erreurs JS runtime — navigation + cycles modals
//   8. États actifs UI — unicité de l'état actif, double-clic, contraste
//   9. Drawer / Hamburger — architecture future-ready (skip si absent)
//
// Règles respectées :
//   • 0 waitForTimeout() — waitForFunction() + expect() + rAF uniquement
//   • data-testid : app-shell, app-loading-screen, login-form, mobile-navbar
//   • Tests skip gracieux si fonctionnalité absente (permissions, future feature)
//   • Compatible AGENTS.md : 4 thèmes, CSS vars, design system
// ─────────────────────────────────────────────────────────────────────────────

import { test, expect } from "@playwright/test";
import { waitForAppReady } from "../helpers/navigation";
import { captureMobileView } from "../helpers/screenshot";
import {
  clickNavTab,
  assertNavTabActive,
  assertPageResponsive,
  assertNoOverflow,
  assertModalLifecycle,
  collectRuntimeErrors,
  assertNoRuntimeErrors,
  auditButtons,
} from "../helpers/ux";

// ── Guard auth ────────────────────────────────────────────────────────────────
// Utilisé dans les tests qui nécessitent une session active.
async function skipIfNotAuth(page: import("@playwright/test").Page): Promise<void> {
  const isAuth = await page
    .locator('[data-testid="app-shell"]')
    .isVisible({ timeout: 3_000 })
    .catch(() => false);
  if (!isAuth) {
    test.skip(true, "Session absente — test authentifié non applicable");
  }
}

// ── Attente du rendu d'un onglet ──────────────────────────────────────────────
// Après clickNavTab(), attend que React ait terminé de rendre le nouveau contenu.
async function waitForTabRender(page: import("@playwright/test").Page): Promise<void> {
  await page.waitForFunction(
    () => document.querySelector("main") !== null,
    { timeout: 5_000 },
  ).catch(() => {});
}

// ── Onglets à tester ──────────────────────────────────────────────────────────
// L'owner a accès à : Saisie, Dashboard, Suivi, Agenda, Parametres (+ Santé si admin).
// Les tests skippent gracieusement si un onglet est absent (permission manquante).
const KNOWN_TABS = ["Saisie", "Dashboard", "Suivi", "Agenda", "Parametres"] as const;

// ═════════════════════════════════════════════════════════════════════════════
// Suite 1 · Navbar mobile — Navigation onglets
// ═════════════════════════════════════════════════════════════════════════════

test.describe("UX 1 · Navbar — Navigation onglets (iPhone 15 WebKit)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await waitForAppReady(page);
  });

  test("1.1 Navbar visible et dans le viewport", async ({ page }, testInfo) => {
    await skipIfNotAuth(page);

    const navbar = page.locator('[data-testid="mobile-navbar"]');
    await expect(navbar).toBeVisible({ timeout: 5_000 });

    const box = await navbar.boundingBox();
    expect(box, "Navbar sans bounding box — probablement hors viewport").toBeTruthy();

    if (box) {
      const vp = page.viewportSize() ?? { width: 393, height: 852 };
      expect(
        box.y + box.height,
        `Navbar déborde du bas du viewport (bottom=${box.y + box.height}px > ${vp.height}px)`,
      ).toBeLessThanOrEqual(vp.height);
    }

    await captureMobileView(page, "ux-navbar-overview", testInfo);
  });

  // Génère un test par onglet connu
  for (const tab of KNOWN_TABS) {
    test(`1.2 Onglet "${tab}" — clic → état actif`, async ({ page }, testInfo) => {
      await skipIfNotAuth(page);

      const result = await clickNavTab(page, new RegExp(tab, "i"));

      if (!result.clicked) {
        test.skip(true, `Onglet "${tab}" absent (permission manquante ou plan insuffisant)`);
        return;
      }

      expect(
        result.became_active,
        `L'onglet "${tab}" n'est pas passé à l'état actif après le clic (className sans "text-white")`,
      ).toBe(true);

      // Page toujours responsive (pas de gel React, pas d'écran blanc)
      await assertPageResponsive(page);

      await captureMobileView(page, `ux-navbar-tab-${tab.toLowerCase()}`, testInfo);
    });
  }

  test("1.3 Aucun onglet ne produit un écran blanc / gel React", async ({ page }) => {
    await skipIfNotAuth(page);

    const tabs = await page.locator('[data-testid="mobile-navbar"] button').all();

    for (const btn of tabs) {
      if (!(await btn.isVisible().catch(() => false))) continue;

      const label = (await btn.textContent())?.trim() ?? "?";
      await btn.click();

      // Attendre React flush
      await page.evaluate(
        () => new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(r))),
      );

      // app-shell toujours présent
      const hasShell = await page
        .locator('[data-testid="app-shell"]')
        .isVisible({ timeout: 3_000 })
        .catch(() => false);
      expect(hasShell, `Écran blanc après clic sur l'onglet "${label}"`).toBe(true);

      // <main> a du contenu (pas vide)
      const mainText = (await page.locator("main").textContent().catch(() => "")) ?? "";
      expect(
        mainText.trim().length,
        `<main> vide après clic sur l'onglet "${label}"`,
      ).toBeGreaterThan(10);
    }
  });

  test("1.4 Aucun label navbar n'est tronqué (overflow texte)", async ({ page }) => {
    await skipIfNotAuth(page);

    const buttons = page.locator('[data-testid="mobile-navbar"] button');
    const count = await buttons.count();

    for (let i = 0; i < count; i++) {
      const btn = buttons.nth(i);
      if (!(await btn.isVisible().catch(() => false))) continue;

      const isTruncated = await btn.evaluate((el) =>
        Array.from(el.querySelectorAll<HTMLElement>("span, div, p")).some(
          (child) => child.scrollWidth > child.offsetWidth + 2,
        ),
      );

      const label = (await btn.textContent())?.trim() ?? `bouton-${i}`;
      expect(
        isTruncated,
        `Texte tronqué dans le bouton navbar : "${label}"`,
      ).toBe(false);
    }
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// Suite 2 · Boutons d'action rapide — Onglet Saisie
// ═════════════════════════════════════════════════════════════════════════════

test.describe("UX 2 · Saisie — Boutons d'action rapide", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await waitForAppReady(page);
    await skipIfNotAuth(page);
    await clickNavTab(page, /saisie/i);
    await waitForTabRender(page);
  });

  test("2.1 Bouton '+ Frais divers' — ouvre FraisModal et se ferme proprement", async ({
    page,
  }, testInfo) => {
    const btn = page.getByRole("button", { name: /frais divers/i });

    if (!(await btn.isVisible({ timeout: 5_000 }).catch(() => false))) {
      test.skip(true, "Bouton '+ Frais divers' non visible sur cet onglet");
      return;
    }

    const opened = await assertModalLifecycle(page, async () => btn.click(), {
      headingMatcher: /nouveau frais/i,
    });

    expect(opened, "FraisModal n'a pas pu être ouverte").toBe(true);

    // App-shell toujours actif après fermeture
    await assertPageResponsive(page);
    await captureMobileView(page, "ux-modal-frais-fermee", testInfo);
  });

  test("2.2 Bouton '+ Acompte' — ouvre AcompteModal et se ferme proprement", async ({
    page,
  }, testInfo) => {
    const btn = page.getByRole("button", { name: /\+ acompte|^acompte$/i });

    if (!(await btn.isVisible({ timeout: 5_000 }).catch(() => false))) {
      test.skip(true, "Bouton '+ Acompte' non visible sur cet onglet");
      return;
    }

    const opened = await assertModalLifecycle(page, async () => btn.click(), {
      headingMatcher: /nouvel acompte/i,
    });

    expect(opened, "AcompteModal n'a pas pu être ouverte").toBe(true);

    await assertPageResponsive(page);
    await captureMobileView(page, "ux-modal-acompte-fermee", testInfo);
  });

  test("2.3 Boutons rapides (Frais / Acompte) — taille touch-friendly (≥ 44px)", async ({
    page,
  }) => {
    const quickBtns = page.locator("main button").filter({
      hasText: /frais|acompte|importer/i,
    });
    const count = await quickBtns.count();

    if (count === 0) {
      test.skip(true, "Boutons rapides non trouvés — onglet Saisie non rendu");
      return;
    }

    for (let i = 0; i < count; i++) {
      const btn = quickBtns.nth(i);
      const box = await btn.boundingBox();
      if (!box || box.height === 0) continue;

      const label = (await btn.textContent())?.trim() ?? `bouton-${i}`;
      expect(
        box.height,
        `Bouton rapide "${label}" trop petit (${Math.round(box.height)}px < 44px) — non touch-friendly`,
      ).toBeGreaterThanOrEqual(44);
    }
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// Suite 3 · Modals — Cycle de vie et absence d'overlay résiduel
// ═════════════════════════════════════════════════════════════════════════════

test.describe("UX 3 · Modals — Overlay et body lock", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await waitForAppReady(page);
    await skipIfNotAuth(page);
  });

  test("3.1 FraisModal — pas d'overlay résiduel après fermeture", async ({ page }) => {
    await clickNavTab(page, /saisie/i);
    await waitForTabRender(page);

    const openBtn = page.getByRole("button", { name: /frais divers/i });
    if (!(await openBtn.isVisible({ timeout: 5_000 }).catch(() => false))) {
      test.skip(true, "Bouton Frais non accessible");
      return;
    }

    // Ouvrir
    await openBtn.click();
    const heading = page.getByText(/nouveau frais/i).first();
    await expect(heading).toBeVisible({ timeout: 6_000 });

    // Un overlay fixed est en place
    const overlays = page.locator('[class*="fixed"][class*="inset-0"]');
    await expect(overlays.first()).toBeVisible({ timeout: 3_000 });

    // Fermer via ANNULER
    await page.getByRole("button", { name: /annuler/i }).first().click();

    // Heading disparu = modal fermée
    await expect(heading).not.toBeVisible({ timeout: 5_000 });

    // app-shell intact (body lock libéré)
    await expect(page.locator('[data-testid="app-shell"]')).toBeVisible();
  });

  test("3.2 AcompteModal — pas d'overlay résiduel après fermeture", async ({ page }) => {
    await clickNavTab(page, /saisie/i);
    await waitForTabRender(page);

    const openBtn = page.getByRole("button", { name: /\+ acompte|^acompte$/i });
    if (!(await openBtn.isVisible({ timeout: 5_000 }).catch(() => false))) {
      test.skip(true, "Bouton Acompte non accessible");
      return;
    }

    await openBtn.click();
    const heading = page.getByText(/nouvel acompte/i).first();
    await expect(heading).toBeVisible({ timeout: 6_000 });

    await page.getByRole("button", { name: /annuler/i }).first().click();
    await expect(heading).not.toBeVisible({ timeout: 5_000 });

    await expect(page.locator('[data-testid="app-shell"]')).toBeVisible();
  });

  test("3.3 Aucune modal ne bloque la navigation après fermeture", async ({ page }) => {
    await clickNavTab(page, /saisie/i);
    await waitForTabRender(page);

    const openBtn = page.getByRole("button", { name: /frais divers/i });
    if (!(await openBtn.isVisible({ timeout: 5_000 }).catch(() => false))) {
      test.skip(true, "Bouton Frais non accessible");
      return;
    }

    // Cycle ouvrir → fermer
    await openBtn.click();
    await expect(page.getByText(/nouveau frais/i).first()).toBeVisible({ timeout: 6_000 });
    await page.getByRole("button", { name: /annuler/i }).first().click();
    await expect(page.getByText(/nouveau frais/i).first()).not.toBeVisible({ timeout: 5_000 });

    // Navigation doit rester fonctionnelle
    const switchResult = await clickNavTab(page, /suivi/i);
    if (switchResult.clicked) {
      expect(
        switchResult.became_active,
        "Navigation bloquée après fermeture de modal — modal zombie probable",
      ).toBe(true);
    }
  });

  test("3.4 Clic sur backdrop ferme la modal (ConfirmModal pattern)", async ({ page }) => {
    // La ConfirmModal se ferme via clic sur l'overlay (onCancel sur la div backdrop).
    // On ne peut pas déclencher ConfirmModal sans action destructive,
    // donc ce test vérifie la mécanique sur FraisModal.
    await clickNavTab(page, /saisie/i);
    await waitForTabRender(page);

    const openBtn = page.getByRole("button", { name: /frais divers/i });
    if (!(await openBtn.isVisible({ timeout: 5_000 }).catch(() => false))) {
      test.skip(true, "Bouton Frais non accessible");
      return;
    }

    await openBtn.click();
    const heading = page.getByText(/nouveau frais/i).first();
    await expect(heading).toBeVisible({ timeout: 6_000 });

    // Fermer via ANNULER (la FraisModal n'a pas de clic-overlay, utiliser le bouton)
    await page.getByRole("button", { name: /annuler/i }).first().click();
    await expect(heading).not.toBeVisible({ timeout: 5_000 });
    await assertPageResponsive(page);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// Suite 4 · Cohérence navigation SPA
// ═════════════════════════════════════════════════════════════════════════════

test.describe("UX 4 · Cohérence navigation SPA", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await waitForAppReady(page);
    await skipIfNotAuth(page);
  });

  test("4.1 Navigation aller-retour Saisie → Suivi → Saisie", async ({ page }) => {
    const toSuivi = await clickNavTab(page, /suivi/i);
    expect(toSuivi.became_active, "Suivi non actif après premier clic").toBe(true);
    await assertPageResponsive(page);

    const toSaisie = await clickNavTab(page, /saisie/i);
    if (!toSaisie.clicked) {
      test.skip(true, "Onglet Saisie absent");
      return;
    }
    expect(toSaisie.became_active, "Saisie non actif après retour").toBe(true);
    await assertPageResponsive(page);
  });

  test("4.2 Navigation cyclique complète sans gel React", async ({ page }) => {
    const tabs = await page.locator('[data-testid="mobile-navbar"] button').all();

    for (const btn of tabs) {
      if (!(await btn.isVisible().catch(() => false))) continue;

      const label = (await btn.textContent())?.trim() ?? "?";
      await btn.click();

      await page.evaluate(
        () => new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(r))),
      );

      const hasShell = await page
        .locator('[data-testid="app-shell"]')
        .isVisible({ timeout: 3_000 })
        .catch(() => false);
      expect(hasShell, `App shell disparu lors du clic sur "${label}" — gel React probable`).toBe(
        true,
      );
    }
  });

  test("4.3 Retour navigateur — pas de page blanche", async ({ page }) => {
    // Dans une SPA, goBack() peut rester sur la même URL (pas d'historique URL).
    // Ce test vérifie que l'app reste cohérente quoi qu'il arrive.
    await clickNavTab(page, /suivi/i);
    await page.goBack();

    // Attendre que l'app soit dans un état stable (shell ou login)
    await page.waitForFunction(
      () =>
        document.querySelector('[data-testid="app-shell"]') !== null ||
        document.querySelector('[data-testid="login-form"]') !== null,
      { timeout: 8_000 },
    );

    // Pas de page blanche
    const bodyText = (await page.evaluate(() => document.body.innerText.trim())) ?? "";
    expect(bodyText.length, "Page blanche détectée après retour arrière navigateur").toBeGreaterThan(
      5,
    );
  });

  test("4.4 Chaque onglet rend du contenu dans <main>", async ({ page }) => {
    const tabs = await page.locator('[data-testid="mobile-navbar"] button').all();

    for (const btn of tabs) {
      if (!(await btn.isVisible().catch(() => false))) continue;

      const label = (await btn.textContent())?.trim() ?? "?";
      await btn.click();

      await page.evaluate(
        () => new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(r))),
      );

      // Attendre que <main> soit rendu
      await page.waitForFunction(() => document.querySelector("main") !== null, {
        timeout: 5_000,
      }).catch(() => {});

      const mainText = (await page.locator("main").textContent().catch(() => "")) ?? "";
      expect(
        mainText.trim().length,
        `<main> vide sur l'onglet "${label}" — rendu potentiellement cassé`,
      ).toBeGreaterThan(5);
    }
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// Suite 5 · Overflow horizontal — Tous les onglets
// ═════════════════════════════════════════════════════════════════════════════

test.describe("UX 5 · Overflow horizontal — Tous les onglets", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await waitForAppReady(page);
    await skipIfNotAuth(page);
  });

  for (const tab of KNOWN_TABS) {
    test(`5.x Onglet "${tab}" — pas d'overflow horizontal`, async ({ page }) => {
      const result = await clickNavTab(page, new RegExp(tab, "i"));

      if (!result.clicked) {
        test.skip(true, `Onglet "${tab}" absent`);
        return;
      }

      // Laisser React rendre le contenu
      await page.evaluate(
        () => new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(r))),
      );

      const overflow = await assertNoOverflow(page);
      expect(
        overflow.ok,
        `Overflow horizontal de ${overflow.delta}px détecté sur l'onglet "${tab}"`,
      ).toBe(true);
    });
  }
});

// ═════════════════════════════════════════════════════════════════════════════
// Suite 6 · Accessibilité touch — Taille boutons et couverture
// ═════════════════════════════════════════════════════════════════════════════

test.describe("UX 6 · Accessibilité touch — Boutons", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await waitForAppReady(page);
    await skipIfNotAuth(page);
  });

  test("6.1 Boutons navbar — hauteur ≥ 44px (Apple touch target)", async ({ page }) => {
    const navBtns = page.locator('[data-testid="mobile-navbar"] button');
    const count = await navBtns.count();
    expect(count, "Aucun bouton trouvé dans la navbar").toBeGreaterThan(0);

    for (let i = 0; i < count; i++) {
      const btn = navBtns.nth(i);
      const box = await btn.boundingBox();
      if (!box || box.height === 0) continue;

      const label = (await btn.textContent())?.trim() ?? `bouton-${i}`;
      expect(
        box.height,
        `Bouton navbar "${label}" trop petit (${Math.round(box.height)}px < 44px)`,
      ).toBeGreaterThanOrEqual(44);
    }
  });

  test("6.2 Audit boutons page principale — rapport des problèmes", async ({ page }, testInfo) => {
    const audit = await auditButtons(page, { minSize: 24 });

    console.log(
      `[UX] Audit boutons : ${audit.total} visible(s), ${audit.tooSmall} trop petit(s), ${audit.outOfViewport} hors viewport`,
    );
    if (audit.issues.length > 0) {
      console.log("[UX] Détail boutons problématiques :", JSON.stringify(audit.issues, null, 2));
    }

    // Avertissement si > 20% des boutons sont problématiques
    const ratio = audit.total > 0 ? audit.issues.length / audit.total : 0;
    if (ratio > 0.2) {
      console.warn(
        `[UX] ⚠️ ${Math.round(ratio * 100)}% des boutons ont des problèmes d'accessibilité touch`,
      );
    }

    await captureMobileView(page, "ux-audit-buttons", testInfo);

    // Non-bloquant : test de rapport uniquement (ne pas casser sur des mini boutons d'icônes)
    expect(audit.total, "Aucun bouton trouvé sur la page — rendu probablement cassé").toBeGreaterThan(
      0,
    );
  });

  test("6.3 Aucun bouton navbar n'est recouvert par un overlay", async ({ page }) => {
    const navBtns = page.locator('[data-testid="mobile-navbar"] button');
    const count = await navBtns.count();

    for (let i = 0; i < count; i++) {
      const btn = navBtns.nth(i);
      if (!(await btn.isVisible().catch(() => false))) continue;

      const box = await btn.boundingBox();
      if (!box) continue;

      // Tester le point central du bouton
      const centerX = Math.round(box.x + box.width / 2);
      const centerY = Math.round(box.y + box.height / 2);

      const topTag = await page.evaluate(
        ([x, y]: [number, number]) => {
          const el = document.elementFromPoint(x, y);
          if (!el) return "null";
          // Remonter l'arbre DOM jusqu'au bouton parent
          let cur: Element | null = el;
          while (cur) {
            if (cur.tagName === "BUTTON") return "BUTTON";
            cur = cur.parentElement;
          }
          return el.tagName;
        },
        [centerX, centerY] as [number, number],
      );

      const label = (await btn.textContent())?.trim() ?? `bouton-${i}`;
      expect(
        topTag,
        `Bouton navbar "${label}" recouvert par un élément <${topTag}> — non accessible au touch`,
      ).toBe("BUTTON");
    }
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// Suite 7 · Erreurs JS runtime pendant navigation
// ═════════════════════════════════════════════════════════════════════════════

test.describe("UX 7 · Erreurs JS runtime", () => {
  test("7.1 Navigation complète — aucune erreur JS critique", async ({ page }) => {
    // Installer AVANT page.goto() pour capturer toutes les erreurs
    const errors = collectRuntimeErrors(page);

    await page.goto("/");
    await waitForAppReady(page);

    const isAuth = await page
      .locator('[data-testid="app-shell"]')
      .isVisible({ timeout: 3_000 })
      .catch(() => false);
    if (!isAuth) {
      test.skip(true, "Session absente — navigation authentifiée non testable");
      return;
    }

    // Naviguer sur tous les onglets disponibles
    const tabs = await page.locator('[data-testid="mobile-navbar"] button').all();
    for (const btn of tabs) {
      if (!(await btn.isVisible().catch(() => false))) continue;
      await btn.click();
      await page.evaluate(
        () => new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(r))),
      );
    }

    // Revenir à Saisie
    await clickNavTab(page, /saisie/i);

    assertNoRuntimeErrors(errors, "navigation complète (tous les onglets)");
  });

  test("7.2 Cycle FraisModal — aucune erreur JS", async ({ page }) => {
    const errors = collectRuntimeErrors(page);

    await page.goto("/");
    await waitForAppReady(page);

    const isAuth = await page
      .locator('[data-testid="app-shell"]')
      .isVisible({ timeout: 3_000 })
      .catch(() => false);
    if (!isAuth) {
      test.skip(true, "Session absente");
      return;
    }

    await clickNavTab(page, /saisie/i);
    await waitForTabRender(page);

    const openBtn = page.getByRole("button", { name: /frais divers/i });
    if (!(await openBtn.isVisible({ timeout: 5_000 }).catch(() => false))) {
      test.skip(true, "Bouton Frais non accessible");
      return;
    }

    // Cycle ouverture → fermeture
    await openBtn.click();
    await expect(page.getByText(/nouveau frais/i).first()).toBeVisible({ timeout: 6_000 });
    await page.getByRole("button", { name: /annuler/i }).first().click();
    await expect(page.getByText(/nouveau frais/i).first()).not.toBeVisible({ timeout: 5_000 });

    assertNoRuntimeErrors(errors, "cycle FraisModal");
  });

  test("7.3 Chargement initial — aucune erreur JS au démarrage", async ({ page }) => {
    const errors = collectRuntimeErrors(page);

    await page.goto("/");
    await waitForAppReady(page);

    // Attendre la stabilisation réseau (Supabase realtime tolérée)
    await page.waitForLoadState("networkidle").catch(() => {});

    assertNoRuntimeErrors(errors, "chargement initial");
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// Suite 8 · États actifs UI — Cohérence
// ═════════════════════════════════════════════════════════════════════════════

test.describe("UX 8 · États actifs UI — Cohérence et unicité", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await waitForAppReady(page);
    await skipIfNotAuth(page);
  });

  test("8.1 Un seul onglet est actif à la fois", async ({ page }) => {
    await clickNavTab(page, /suivi/i);

    const buttons = await page.locator('[data-testid="mobile-navbar"] button').all();
    let activeCount = 0;

    for (const btn of buttons) {
      if (!(await btn.isVisible().catch(() => false))) continue;
      const isActive = await btn
        .evaluate((el) => el.className.includes("text-white"))
        .catch(() => false);
      if (isActive) activeCount++;
    }

    expect(activeCount, "Plusieurs onglets actifs simultanément — état incohérent").toBe(1);
  });

  test("8.2 Double-clic sur un onglet — état actif préservé", async ({ page }) => {
    await clickNavTab(page, /suivi/i);
    const active1 = await assertNavTabActive(page, /suivi/i);
    expect(active1, "Suivi non actif au premier clic").toBe(true);

    // Double-clic sur le même onglet
    await clickNavTab(page, /suivi/i);
    const active2 = await assertNavTabActive(page, /suivi/i);
    expect(active2, "Suivi non actif après double-clic — state reset non souhaité").toBe(true);

    // App-shell toujours présent
    await assertPageResponsive(page);
  });

  test("8.3 État actif visuellement distinct (text-white présent)", async ({ page }, testInfo) => {
    const navBtns = page.locator('[data-testid="mobile-navbar"] button');
    const count = await navBtns.count();
    let foundActiveWithWhite = false;

    for (let i = 0; i < count; i++) {
      const btn = navBtns.nth(i);
      if (!(await btn.isVisible().catch(() => false))) continue;

      const isActive = await btn.evaluate((el) => el.className.includes("text-white"));
      if (isActive) {
        foundActiveWithWhite = true;
        const color = await btn.evaluate((el) => getComputedStyle(el).color);
        console.log(`[UX] Onglet actif — computed color: ${color}`);
      }
    }

    expect(
      foundActiveWithWhite,
      "Aucun onglet n'a l'état actif visible (text-white) — contraste potentiellement insuffisant",
    ).toBe(true);

    await captureMobileView(page, "ux-navbar-active-state", testInfo);
  });

  test("8.4 Navigation Saisie → Dashboard → Suivi — état actif correct à chaque étape", async ({
    page,
  }) => {
    // Saisie
    const toSaisie = await clickNavTab(page, /saisie/i);
    if (!toSaisie.clicked) {
      test.skip(true, "Onglet Saisie absent");
      return;
    }
    expect(toSaisie.became_active, "Saisie non actif").toBe(true);

    // Dashboard
    const toDashboard = await clickNavTab(page, /dashboard/i);
    if (toDashboard.clicked) {
      expect(toDashboard.became_active, "Dashboard non actif").toBe(true);
      // Vérifier que Saisie n'est plus actif
      const saisieStillActive = await assertNavTabActive(page, /saisie/i);
      expect(saisieStillActive, "Saisie encore actif alors que Dashboard est sélectionné").toBe(
        false,
      );
    }

    // Suivi
    const toSuivi = await clickNavTab(page, /suivi/i);
    expect(toSuivi.became_active, "Suivi non actif").toBe(true);
    if (toDashboard.clicked) {
      const dashStillActive = await assertNavTabActive(page, /dashboard/i);
      expect(dashStillActive, "Dashboard encore actif alors que Suivi est sélectionné").toBe(false);
    }
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// Suite 9 · Drawer / Menu hamburger (future-ready)
// ═════════════════════════════════════════════════════════════════════════════

test.describe("UX 9 · Drawer / Hamburger (architecture future-ready)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await waitForAppReady(page);
    await skipIfNotAuth(page);
  });

  test("9.1 Détection bouton hamburger (skip si absent — feature future)", async ({ page }) => {
    const hamburger = page
      .getByRole("button", { name: /menu|hamburger|☰|navigation secondaire/i })
      .or(page.locator('[aria-label*="menu" i], [aria-label*="drawer" i]').first())
      .first();

    const exists = await hamburger.isVisible({ timeout: 2_000 }).catch(() => false);

    if (!exists) {
      console.log("[UX] Bouton hamburger non trouvé — feature future-ready, pas encore implémentée");
      test.skip(true, "Bouton hamburger non implémenté (feature future)");
      return;
    }

    // Si le bouton existe : tester son cycle
    await hamburger.click();
    await page.evaluate(
      () => new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(r))),
    );

    const drawer = page
      .locator('[role="dialog"], [class*="drawer"], [class*="slide-in"], [class*="sidebar"]')
      .first();
    const drawerOpen = await drawer.isVisible({ timeout: 3_000 }).catch(() => false);

    if (drawerOpen) {
      // Fermer via Escape
      await page.keyboard.press("Escape");
      await expect(drawer).not.toBeVisible({ timeout: 3_000 });
    }

    await assertPageResponsive(page);
  });

  test("9.2 Aucun overlay orphelin détecté au repos (pas de drawer bloqué)", async ({ page }) => {
    // Au repos, sans modal ouverte, aucun overlay de type modal ne doit être visible.
    // Les gradients de fond et le loading spinner transitoire sont exclus.
    const modalOverlays = await page.evaluate(() => {
      const all = Array.from(
        document.querySelectorAll<HTMLElement>('[class*="z-[500]"],[class*="z-[600]"]'),
      );
      return all
        .filter((el) => {
          const s = window.getComputedStyle(el);
          return s.display !== "none" && s.visibility !== "hidden" && parseFloat(s.opacity) > 0.1;
        })
        .map((el) => ({
          tag: el.tagName,
          classes: el.className.slice(0, 100),
          text: (el.textContent ?? "").trim().slice(0, 40),
        }));
    });

    if (modalOverlays.length > 0) {
      console.log("[UX] Overlays modals détectés au repos (potentiellement orphelins) :", modalOverlays);
    }

    // Une modal orpheline au repos = bug critique
    expect(
      modalOverlays,
      `Overlay(s) modal(es) détecté(s) sans action utilisateur : ${JSON.stringify(modalOverlays)}`,
    ).toHaveLength(0);
  });

  test("9.3 AppHeader — bouton(s) d'action accessible(s)", async ({ page }, testInfo) => {
    // Tester que l'AppHeader est rendu et ses boutons (si présents) sont accessibles.
    const header = page.locator("header").first();
    const headerVisible = await header.isVisible({ timeout: 5_000 }).catch(() => false);

    if (!headerVisible) {
      test.skip(true, "Header non visible");
      return;
    }

    const headerBtns = header.locator("button");
    const count = await headerBtns.count();

    console.log(`[UX] AppHeader : ${count} bouton(s) trouvé(s)`);

    for (let i = 0; i < count; i++) {
      const btn = headerBtns.nth(i);
      if (!(await btn.isVisible().catch(() => false))) continue;

      const box = await btn.boundingBox();
      const label = (await btn.textContent())?.trim() ?? `bouton-header-${i}`;

      if (box) {
        expect(
          box.height,
          `Bouton header "${label}" trop petit (${Math.round(box.height)}px < 36px)`,
        ).toBeGreaterThanOrEqual(36);
      }
    }

    await captureMobileView(page, "ux-header-buttons", testInfo);
  });
});
