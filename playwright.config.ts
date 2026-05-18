// playwright.config.ts
import { defineConfig, devices } from "@playwright/test";
import * as dotenv from "dotenv";

// Charger les variables d'environnement pour les tests E2E
dotenv.config({ path: ".env.local" });

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:5173";

export default defineConfig({
  testDir: "./e2e",
  testMatch: "**/*.spec.ts",

  // Timeout global par test
  timeout: 30_000,

  // Timeout pour expect() (assertions)
  expect: { timeout: 8_000 },

  // Nombre de retries en CI (0 en local pour rapidité)
  retries: process.env.CI ? 1 : 0,

  // Parallélisme : désactivé par défaut (tests auth séquentiels)
  workers: process.env.CI ? 1 : 1,

  // Reporter
  reporter: [
    ["list"],
    ["html", { outputFolder: "playwright-report", open: "never" }],
    ...(process.env.CI ? [["github"] as ["github"]] : []),
  ],

  // Screenshot uniquement en cas d'échec
  use: {
    baseURL: BASE_URL,
    headless: true,
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    trace: "retain-on-failure",

    // Locale française pour les sélecteurs de dates
    locale: "fr-FR",
    timezoneId: "Europe/Paris",
  },

  projects: [
    // Setup : création des sessions auth (exécuté en premier)
    {
      name: "setup",
      testMatch: "**/setup/*.ts",
    },

    // Tests principaux sur Chromium
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        // Réutilise la session sauvegardée
        storageState: "e2e/.auth/owner.json",
      },
      dependencies: ["setup"],
      testMatch: "**/*.spec.ts",
    },

    // Tests multi-user (isolation cross-user)
    {
      name: "chromium-userB",
      use: {
        ...devices["Desktop Chrome"],
        storageState: "e2e/.auth/userB.json",
      },
      dependencies: ["setup"],
      testMatch: "**/security.spec.ts",
    },
  ],

  // Démarrage automatique du serveur de dev pour les tests en local
  webServer: process.env.CI
    ? undefined
    : {
        command: "npm run dev",
        url: BASE_URL,
        reuseExistingServer: true,
        timeout: 30_000,
      },
});
