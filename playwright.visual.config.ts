// playwright.visual.config.ts
// ─────────────────────────────────────────────────────────────────────────────
// Configuration Playwright dédiée aux tests de régression visuelle.
//
// Séparée de playwright.config.ts pour un workflow indépendant.
// Les snapshots de référence sont dans e2e/snapshots/ et doivent être commités.
//
// Commandes :
//   npm run e2e:visual               — vérification (compare aux baselines)
//   npm run e2e:visual:update        — générer / mettre à jour les baselines
//   npm run e2e:visual:iphone        — iPhone 15 WebKit seulement
//   npm run e2e:visual:desktop       — Desktop Chrome seulement
//   npm run e2e:visual:report        — ouvrir le rapport HTML
// ─────────────────────────────────────────────────────────────────────────────

import { defineConfig, devices } from "@playwright/test";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:5173";

export default defineConfig({
  testDir: "./e2e/visual",
  testMatch: "**/*.spec.ts",

  // Plus long que les tests fonctionnels (screenshots + thème switch + reload)
  timeout: 60_000,

  expect: {
    timeout: 12_000,
    toHaveScreenshot: {
      // 2 % de pixels différents tolérés (anti-aliasing, subpixel rendering)
      maxDiffPixelRatio: 0.02,
      // Différence de couleur par pixel (0–1). 0.2 = tolérance raisonnable.
      threshold: 0.2,
      // Désactiver les animations via Playwright (en plus du CSS injection)
      animations: "disabled",
    },
  },

  // 1 retry pour absorber les rares faux positifs de rendu
  retries: 1,

  // Séquentiel : stabilité maximale des screenshots
  workers: 1,

  // Snapshots de référence versionnés dans git
  snapshotDir: "./e2e/snapshots",

  // Nommage : e2e/snapshots/{project}/{snapshotName}.png
  // → e2e/snapshots/visual-iphone/navbar-neon.png
  snapshotPathTemplate: "{snapshotDir}/{projectName}/{arg}{ext}",

  reporter: [
    ["list"],
    [
      "html",
      {
        outputFolder: "playwright-visual-report",
        open: "never",
      },
    ],
  ],

  use: {
    baseURL: BASE_URL,
    headless: true,

    // Screenshot systématique (les visuels sont la raison d'être de ces tests)
    screenshot: "on",
    video: "retain-on-failure",
    trace: "retain-on-failure",

    // Locale et timezone FR pour l'affichage des dates
    locale: "fr-FR",
    timezoneId: "Europe/Paris",
  },

  projects: [
    // ── iPhone 15 — WebKit / Safari ─────────────────────────────────────────
    // Priorité 1 : safari-specific glass bugs, safe-area, subpixel rendering.
    {
      name: "visual-iphone",
      use: {
        ...devices["iPhone 15"],
        storageState: "e2e/.auth/owner.json",
      },
      // Thèmes mobile + composant navbar
      testMatch: [
        "**/themes-mobile.spec.ts",
        "**/navigation-mobile.spec.ts",
      ],
    },

    // ── Desktop Chrome — 1280×800 ────────────────────────────────────────────
    // Priorité 2 : desktop layout, sidebar, wider viewport.
    {
      name: "visual-desktop",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1280, height: 800 },
        storageState: "e2e/.auth/owner.json",
      },
      testMatch: ["**/themes-desktop.spec.ts"],
    },

    // ── Login / Splash — sans session (Chrome mobile viewport) ───────────────
    // Pas de storageState → l'app charge sans auth → splash + formulaire login.
    {
      name: "visual-login",
      use: {
        ...devices["Desktop Chrome"],
        // Viewport mobile pour reproduire l'expérience cible
        viewport: { width: 390, height: 844 },
        // storageState absent intentionnellement — état non-authentifié
      },
      testMatch: ["**/critical-states.spec.ts"],
    },
  ],

  // Serveur de dev réutilisé si déjà lancé (npm run dev)
  webServer: {
    command: "npm run dev",
    url: BASE_URL,
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
