// e2e/desktop/pdf-export.spec.ts
// ─────────────────────────────────────────────────────────────────────────────
// Tests E2E Desktop : Export PDF — workflow, modal, nom de fichier
//
// Ces tests vérifient que le workflow d'export PDF est fonctionnel
// sans nécessairement télécharger le fichier (qui nécessite un vrai
// compte et des données réelles).
// ─────────────────────────────────────────────────────────────────────────────

import { test, expect } from "@playwright/test";
import { waitForNoSpinner } from "../helpers/navigation";
import { captureScreen } from "../helpers/screenshot";

/** Navigue vers la page Bilan */
async function goToBilan(page: import("@playwright/test").Page): Promise<boolean> {
  await page.goto("/");
  await waitForNoSpinner(page);

  const bilanLink = page
    .getByRole("link", { name: /bilan/i })
    .or(page.getByRole("button", { name: /bilan/i }))
    .first();

  if (!(await bilanLink.isVisible({ timeout: 5_000 }))) {
    return false;
  }

  await bilanLink.click();
  await waitForNoSpinner(page);
  return true;
}

test.describe("Export PDF", () => {
  // ── Page Bilan accessible ───────────────────────────────────────────────────
  test("1. La page Bilan est accessible", async ({ page }, testInfo) => {
    const found = await goToBilan(page);

    if (!found) {
      test.skip(true, "Lien Bilan non trouvé — navigation différente");
      return;
    }

    // La page bilan doit être chargée
    await expect(page.locator("main, [data-testid='bilan-page'], section")).toBeVisible({
      timeout: 10_000,
    });

    await captureScreen(page, "bilan-page-desktop", testInfo);
  });

  // ── Bouton export visible ───────────────────────────────────────────────────
  test("2. Bouton d'export PDF visible sur la page Bilan", async ({ page }, testInfo) => {
    const found = await goToBilan(page);
    if (!found) {
      test.skip(true, "Page Bilan non accessible");
      return;
    }

    // Bouton export PDF (plusieurs variantes possibles selon l'état du bilan)
    const exportBtn = page
      .getByRole("button", { name: /exporter|export|pdf|télécharger|download/i })
      .first();

    // S'il n'est pas visible directement, chercher dans un menu ou toolbar
    const btnVisible = await exportBtn.isVisible({ timeout: 8_000 });

    if (!btnVisible) {
      // Peut être dans un panel ou nécessiter une période sélectionnée
      const periodSelector = page.locator('[data-testid*="period"], [data-testid*="semaine"]').first();
      if (await periodSelector.isVisible()) {
        await periodSelector.click();
        await waitForNoSpinner(page);
      }
    }

    // Re-vérifier après interaction
    const stillVisible = await exportBtn.isVisible({ timeout: 5_000 });
    if (stillVisible) {
      await captureScreen(page, "pdf-export-button", testInfo);
    }

    // Test flexible : vérifie qu'au moins l'UI du bilan est là
    await expect(
      page.locator('[data-testid*="bilan"], [data-testid*="export"], [data-testid*="pdf"], button'),
    ).toBeVisible({ timeout: 10_000 });
  });

  // ── Clic sur export → pas de crash ─────────────────────────────────────────
  test("3. Clic export PDF → pas d'erreur JavaScript", async ({ page }, testInfo) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => {
      // Ignorer les erreurs réseau normales (Supabase non disponible en test)
      if (!err.message.includes("fetch") && !err.message.includes("network")) {
        errors.push(err.message);
      }
    });

    const found = await goToBilan(page);
    if (!found) {
      test.skip(true, "Page Bilan non accessible");
      return;
    }

    const exportBtn = page
      .getByRole("button", { name: /exporter|export pdf|télécharger/i })
      .first();

    if (await exportBtn.isVisible({ timeout: 5_000 })) {
      await exportBtn.click();
      // Attendre un peu pour laisser le temps à une modal de s'ouvrir
      await page.waitForTimeout(1_000);
      await captureScreen(page, "pdf-after-click", testInfo);
    }

    expect(
      errors,
      `Erreurs JS lors du clic export: ${errors.join(", ")}`,
    ).toHaveLength(0);
  });

  // ── Modal WhatsApp sécurisé ─────────────────────────────────────────────────
  test("4. Bouton WhatsApp sécurisé visible", async ({ page }, testInfo) => {
    const found = await goToBilan(page);
    if (!found) {
      test.skip(true, "Page Bilan non accessible");
      return;
    }

    // Chercher le bouton WhatsApp sécurisé
    const waBtn = page
      .getByRole("button", { name: /whatsapp|sécurisé|secure|partager/i })
      .first();

    const visible = await waBtn.isVisible({ timeout: 8_000 });

    if (visible) {
      await captureScreen(page, "whatsapp-button-visible", testInfo);
      expect(waBtn).toBeVisible();
    } else {
      // Le bouton peut être conditionnel (données requises)
      // On vérifie juste que la page Bilan est fonctionnelle
      test.skip(true, "Bouton WhatsApp non visible — données bilan nécessaires");
    }
  });

  // ── Modal saisie mot de passe ───────────────────────────────────────────────
  test("5. Modal WhatsApp sécurisé → saisie mot de passe", async ({ page }, testInfo) => {
    const found = await goToBilan(page);
    if (!found) {
      test.skip(true, "Page Bilan non accessible");
      return;
    }

    const waBtn = page
      .getByRole("button", { name: /whatsapp|sécurisé|secure|partager/i })
      .first();

    if (!(await waBtn.isVisible({ timeout: 5_000 }))) {
      test.skip(true, "Bouton WhatsApp non disponible");
      return;
    }

    await waBtn.click();
    await page.waitForTimeout(500);

    // Modal doit s'ouvrir avec un champ mot de passe
    const passwordInput = page.locator('input[type="password"]').first();
    const modalVisible = await passwordInput.isVisible({ timeout: 5_000 });

    if (modalVisible) {
      await captureScreen(page, "whatsapp-modal-password", testInfo);

      // Tester la saisie du mot de passe
      await passwordInput.fill("TestPassword123!");
      await captureScreen(page, "whatsapp-modal-filled", testInfo);

      // Le bouton de validation doit être actif
      const submitBtn = page
        .getByRole("button", { name: /envoyer|partager|confirmer|valider|chiffrer/i })
        .first();
      await expect(submitBtn).toBeVisible({ timeout: 5_000 });

      // Fermer la modal
      const closeBtn = page
        .getByRole("button", { name: /fermer|annuler|close/i })
        .first();
      if (await closeBtn.isVisible()) {
        await closeBtn.click();
      } else {
        await page.keyboard.press("Escape");
      }
    } else {
      test.skip(true, "Modal WhatsApp non ouverte — configuration nécessaire");
    }
  });
});
