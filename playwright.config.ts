// playwright.config.ts
import { defineConfig, devices } from "@playwright/test";
import * as dotenv from "dotenv";

// Charger les variables d'environnement pour les tests E2E.
// .env.local est prioritaire (dotenv n'ecrase jamais une cle deja definie dans
// process.env), puis .env complete les variables manquantes (cles Supabase,
// identifiants E2E, PLAYWRIGHT_BASE_URL...). Vite lit deja .env de son cote
// pour l'app ; cette double lecture rend ces variables visibles aussi pour le
// process Playwright (config + *.setup.ts).
dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:5173";
const IS_CI = !!process.env.CI;

export default defineConfig({
  testDir: "./e2e",
  testMatch: "**/*.spec.ts",

  // Timeout global par test
  timeout: 30_000,

  // Timeout pour expect() (assertions)
  expect: { timeout: 8_000 },

  // 1 retry en CI uniquement
  retries: IS_CI ? 1 : 0,

  // Sequentiel par defaut (tests auth partages)
  workers: IS_CI ? 1 : 1,

  // Screenshots de reference (visual regression)
  snapshotDir: "./e2e/screenshots",

  // Reporter
  reporter: [
    ["list"],
    ["html", { outputFolder: "playwright-report", open: "never" }],
    ...(IS_CI ? [["github"] as ["github"]] : []),
  ],

  use: {
    baseURL: BASE_URL,
    headless: true,

    // Captures seulement en cas d'echec
    screenshot: "only-on-failure",

    // Video et trace en cas d'echec seulement (evite la surcharge disque)
    video: "retain-on-failure",
    trace: "retain-on-failure",

    // Locale francaise pour les selecteurs de dates et UI
    locale: "fr-FR",
    timezoneId: "Europe/Paris",
  },

  projects: [
    // -- Setup : sessions auth persistantes ---------------------------------
    {
      name: "setup",
      testMatch: "**/setup/*.ts",
    },

    // -- Desktop : Chromium (Chrome) ----------------------------------------
    {
      name: "desktop-chrome",
      use: {
        ...devices["Desktop Chrome"],
        storageState: "e2e/.auth/owner.json",
      },
      dependencies: ["setup"],
      testMatch: ["**/tests/**/*.spec.ts", "**/desktop/**/*.spec.ts"],
    },

    // -- Desktop : Firefox --------------------------------------------------
    {
      name: "desktop-firefox",
      use: {
        ...devices["Desktop Firefox"],
        storageState: "e2e/.auth/owner.json",
      },
      dependencies: ["setup"],
      // Firefox : tests essentiels seulement (pas les specs mobile)
      testMatch: ["**/desktop/**/*.spec.ts", "**/tests/auth.spec.ts"],
    },

    // -- Mobile : iPhone 15 (WebKit / Safari) -------------------------------
    {
      name: "mobile-iphone",
      use: {
        ...devices["iPhone 15"],
        storageState: "e2e/.auth/owner.json",
      },
      dependencies: ["setup"],
      testMatch: ["**/mobile/**/*.spec.ts"],
    },

    // -- Mobile : Pixel 7 (Chrome Android) ----------------------------------
    {
      name: "mobile-pixel",
      use: {
        ...devices["Pixel 7"],
        storageState: "e2e/.auth/owner.json",
      },
      dependencies: ["setup"],
      testMatch: ["**/mobile/**/*.spec.ts"],
    },

    // -- Tests d'isolation cross-user (Chromium uniquement) -----------------
    {
      name: "security",
      use: {
        ...devices["Desktop Chrome"],
        storageState: "e2e/.auth/userB.json",
      },
      dependencies: ["setup"],
      testMatch: "**/tests/security.spec.ts",
    },
  ],

  // Serveur de dev local (ignore en CI qui gere son propre serveur)
  webServer: IS_CI
    ? undefined
    : {
        command: "npm run dev",
        url: BASE_URL,
        reuseExistingServer: true,
        timeout: 60_000,
      },
});
