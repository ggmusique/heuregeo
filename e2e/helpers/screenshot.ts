// e2e/helpers/screenshot.ts
// ─────────────────────────────────────────────────────────────────────────────
// Helper : captures d'écran pour validation visuelle et régression UI.
//
// Utilisation :
//   import { captureScreen } from "../helpers/screenshot";
//   await captureScreen(page, "dashboard-loaded", testInfo);
//
// Les captures sont stockées dans playwright-report/screenshots/.
// ─────────────────────────────────────────────────────────────────────────────

import { type Page, type TestInfo } from "@playwright/test";
import * as path from "path";
import * as fs from "fs";

const SCREENSHOTS_DIR = path.join(process.cwd(), "playwright-report", "screenshots");

/** S'assure que le répertoire de screenshots existe */
function ensureDir(dir: string): void {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

/**
 * Prend une capture d'écran nommée et l'attache au rapport HTML.
 *
 * @param page      - Page Playwright active
 * @param name      - Nom de la capture (sans extension), ex: "dashboard-loaded"
 * @param testInfo  - Contexte du test (pour l'attachement au rapport)
 * @param fullPage  - Capture pleine page (défaut: false)
 */
export async function captureScreen(
  page: Page,
  name: string,
  testInfo: TestInfo,
  fullPage = false,
): Promise<void> {
  ensureDir(SCREENSHOTS_DIR);

  const safeName = name.replace(/[^\w\-]/g, "_");
  const fileName = `${safeName}.png`;
  const filePath = path.join(SCREENSHOTS_DIR, fileName);

  const buffer = await page.screenshot({ path: filePath, fullPage });

  // Attache la capture au rapport HTML Playwright
  await testInfo.attach(safeName, {
    body: buffer,
    contentType: "image/png",
  });
}

/**
 * Capture la vue mobile avec viewport forcé.
 * Utile pour détecter les overflows horizontaux et les éléments hors-écran.
 *
 * @param page     - Page Playwright active
 * @param name     - Nom de la capture
 * @param testInfo - Contexte du test
 */
export async function captureMobileView(
  page: Page,
  name: string,
  testInfo: TestInfo,
): Promise<void> {
  await captureScreen(page, `mobile-${name}`, testInfo, false);

  // Capture pleine page pour détecter les overflows verticaux
  await captureScreen(page, `mobile-${name}-full`, testInfo, true);
}
