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
  });

  test("6. Créer une nouvelle mission", async ({ page }) => {
    // Naviguer vers les missions
    const missionNav = page.getByRole("link", { name: /missions/i }).first();
    if (await missionNav.isVisible({ timeout: 3_000 })) {
      await missionNav.click();
    }

    await waitForNoSpinner(page);

    // Ouvrir le formulaire de création
    const addButton = page
      .getByRole("button", { name: /nouvelle mission|ajouter|créer/i })
      .first();
    await expect(addButton).toBeVisible({ timeout: 8_000 });
    await addButton.click();

    // Remplir le formulaire (sélecteurs adaptés à l'app)
    const clientInput = page.getByLabel(/client/i).first();
    await expect(clientInput).toBeVisible({ timeout: 5_000 });
    await clientInput.fill(TEST_CLIENT);

    // Sélectionner une date (aujourd'hui)
    const dateInput = page.locator('input[type="date"]').first();
    if (await dateInput.isVisible()) {
      const today = new Date().toISOString().split("T")[0];
      await dateInput.fill(today);
    }

    // Heure de début et fin
    const debutInput = page.getByLabel(/début|heure de début/i).first();
    if (await debutInput.isVisible()) {
      await debutInput.fill("09:00");
    }
    const finInput = page.getByLabel(/fin|heure de fin/i).first();
    if (await finInput.isVisible()) {
      await finInput.fill("12:00");
    }

    // Soumettre
    const submitButton = page
      .getByRole("button", { name: /enregistrer|sauvegarder|valider/i })
      .first();
    await submitButton.click();

    await waitForNoSpinner(page);

    // La mission doit apparaître dans la liste
    await expect(page.getByText(TEST_CLIENT)).toBeVisible({ timeout: 10_000 });
  });

  test("7. Modifier une mission existante", async ({ page }) => {
    const missionNav = page.getByRole("link", { name: /missions/i }).first();
    if (await missionNav.isVisible({ timeout: 3_000 })) {
      await missionNav.click();
    }
    await waitForNoSpinner(page);

    // Chercher la mission de test
    const missionRow = page.locator(`text=${TEST_CLIENT}`).first();
    const missionVisible = await missionRow.isVisible({ timeout: 5_000 });

    if (!missionVisible) {
      test.skip(true, "Mission de test non trouvée — exécuter le test de création d'abord");
      return;
    }

    // Cliquer sur le bouton d'édition
    const editButton = missionRow
      .locator("..")
      .getByRole("button", { name: /modifier|éditer|edit/i })
      .first();

    if (!(await editButton.isVisible({ timeout: 2_000 }))) {
      // Essayer un clic sur la ligne pour ouvrir le modal
      await missionRow.click();
    } else {
      await editButton.click();
    }

    // Modifier le client
    const clientInput = page.getByLabel(/client/i).first();
    await expect(clientInput).toBeVisible({ timeout: 5_000 });
    const newClient = `${TEST_CLIENT}_UPDATED`;
    await clientInput.clear();
    await clientInput.fill(newClient);

    const submitButton = page
      .getByRole("button", { name: /enregistrer|sauvegarder|valider/i })
      .first();
    await submitButton.click();

    await waitForNoSpinner(page);
    await expect(page.getByText(newClient)).toBeVisible({ timeout: 8_000 });
  });

  test("8. Supprimer une mission", async ({ page }) => {
    const missionNav = page.getByRole("link", { name: /missions/i }).first();
    if (await missionNav.isVisible({ timeout: 3_000 })) {
      await missionNav.click();
    }
    await waitForNoSpinner(page);

    // Chercher une mission E2E
    const missionRow = page
      .locator(`text=${TEST_CLIENT}`)
      .first();

    if (!(await missionRow.isVisible({ timeout: 5_000 }))) {
      test.skip(true, "Mission de test non trouvée");
      return;
    }

    // Clic sur le bouton de suppression
    const deleteButton = missionRow
      .locator("..")
      .getByRole("button", { name: /supprimer|delete/i })
      .first();

    await expect(deleteButton).toBeVisible({ timeout: 5_000 });
    await deleteButton.click();

    // Confirmation modal
    const confirmButton = page
      .getByRole("button", { name: /confirmer|oui|supprimer|valider/i })
      .last();
    if (await confirmButton.isVisible({ timeout: 3_000 })) {
      await confirmButton.click();
    }

    await waitForNoSpinner(page);
    // La mission ne doit plus être visible
    await expect(page.getByText(TEST_CLIENT)).not.toBeVisible({ timeout: 8_000 });
  });
});
