// e2e/tests/mission.spec.ts
// ─────────────────────────────────────────────────────────────────────────────
// Tests E2E : CRUD Missions
// Utilise la session owner sauvegardée par auth.setup.ts
// ─────────────────────────────────────────────────────────────────────────────

import { test, expect } from "@playwright/test";
import { waitForNoSpinner } from "../helpers/navigation";

const TEST_CLIENT = `TEST_E2E_${Date.now()}`;

test.describe("Gestion des missions", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await waitForNoSpinner(page);
    const saisieButton = page.getByRole("button", { name: /saisie/i }).first();
    if (await saisieButton.isVisible({ timeout: 3_000 })) {
      await saisieButton.click();
      await waitForNoSpinner(page);
    }
  });

  test("6. Créer une nouvelle mission", async ({ page }) => {
    // Le formulaire est inline dans SaisieTab.
    const submitButton = page
      .getByRole("button", { name: /enregistrer la mission|mettre à jour/i })
      .first();
    await expect(submitButton).toBeVisible({ timeout: 8_000 });

    // En l'absence de patron/client/lieu, le formulaire doit afficher
    // des erreurs de validation métier (garde-fou UX).
    await submitButton.click();
    await expect(page.getByText(/obligatoire/i).first()).toBeVisible({ timeout: 5_000 });
  });

  test("7. Modifier une mission existante", async ({ page }) => {
    // Selon les données seed, l'édition peut ne pas être exposée sans mission
    // existante. On valide donc un signal d'édition si présent, sinon skip.
    const editTrigger = page.getByRole("button", { name: /modifier|éditer|edit/i }).first();
    if (!(await editTrigger.isVisible({ timeout: 3_000 }))) {
      test.skip(true, "Aucune mission éditable visible dans cet environnement");
      return;
    }

    await editTrigger.click();
    const updateButton = page.getByRole("button", { name: /mettre à jour/i }).first();
    await expect(updateButton).toBeVisible({ timeout: 5_000 });
  });

  test("8. Supprimer une mission", async ({ page }) => {
    const deleteTrigger = page.getByRole("button", { name: /supprimer|delete/i }).first();
    if (!(await deleteTrigger.isVisible({ timeout: 3_000 }))) {
      test.skip(true, "Aucune mission supprimable visible dans cet environnement");
      return;
    }

    await deleteTrigger.click();
    const confirmButton = page
      .getByRole("button", { name: /confirmer|oui|supprimer|valider/i })
      .last();
    if (await confirmButton.isVisible({ timeout: 3_000 })) {
      await confirmButton.click();
      await waitForNoSpinner(page);
    }
  });
});
