#!/usr/bin/env node
// scripts/audit-theme.mjs
// Audit automatique : détecte les couleurs hardcodées et problèmes de design system
// Usage: node scripts/audit-theme.mjs [--json] [--ci]

import { readdir, readFile } from "fs/promises";
import { join, relative } from "path";

const ROOT = new URL("..", import.meta.url).pathname.replace(/^\/([A-Z]:)/, "$1");
const SRC_DIR = join(ROOT, "src");
const IS_JSON = process.argv.includes("--json");
const IS_CI   = process.argv.includes("--ci");

// Fichiers/dossiers exclus intentionnellement
const EXCLUDE_PATTERNS = [
  "node_modules",
  "dist",
  "dev-dist",
  ".git",
  "exportPDF_Pro",
  "buildInfo",
  "designTokens.ts",
  "ThemeSelector.tsx",
  "WeatherIcon.tsx",    // SVG hex météo sémantiques (⛅🌧 FCD34D, 93C5FD…)
];

// ── Patterns recherchés ──────────────────────────────────────────────────────

const PATTERNS = [
  // ── Catégorie COULEURS ──
  {
    category: "COULEURS",
    name: "Couleur hex hardcodée dans className/color",
    severity: "CRITIQUE",
    points: -5,
    regex: /(?:bg|text|border|stroke|fill|color)\s*[=:]\s*["'`][^"'`]*#[0-9a-fA-F]{3,8}[^"'`]*["'`]/g,
    detail: (m) => m.trim().slice(0, 80),
  },
  {
    category: "COULEURS",
    name: "rgba() inline dans className",
    severity: "CRITIQUE",
    points: -5,
    regex: /className[^"'`]*["'`][^"'`]*rgba\(/g,
    detail: (m) => m.slice(0, 80).trim(),
  },
  {
    category: "COULEURS",
    name: "Couleur Tailwind slate/gray hardcodée",
    severity: "AVERTISSEMENT",
    points: -2,
    regex: /\b(?:bg|text|border)-(?:slate|gray)-\d{3}\b(?!\/)/g,
    detail: (m) => m.trim(),
  },
  {
    category: "COULEURS",
    name: "Classe dark: Tailwind (incompatible multi-thème)",
    severity: "AVERTISSEMENT",
    points: -2,
    regex: /\bdark:[a-z-]+/g,
    detail: (m) => m.trim(),
  },
  {
    category: "COULEURS",
    name: "Hex dans style={{ color }}",
    severity: "INFO",
    points: -1,
    regex: /style=\{[^}]*color:\s*["']#[0-9a-fA-F]+/g,
    detail: (m) => m.slice(0, 80).trim(),
  },

  // ── Catégorie PERFORMANCE ──
  {
    category: "PERFORMANCE",
    name: "transition-all (coûteux en GPU)",
    severity: "INFO",
    points: -1,
    regex: /\btransition-all\b/g,
    detail: (m) => m.trim(),
  },
  {
    category: "PERFORMANCE",
    name: "backdrop-blur imbriqué (risque GPU)",
    severity: "INFO",
    points: -1,
    regex: /backdrop-blur-(?!card|modal|overlay|sm\b)/g,
    detail: (m) => m.trim(),
  },

  // ── Catégorie DESIGN SYSTEM ──
  {
    category: "DESIGN SYSTEM",
    name: "shadow-2xl hardcodé (utiliser shadow-modal)",
    severity: "INFO",
    points: -1,
    regex: /\bshadow-2xl\b/g,
    detail: (m) => m.trim(),
  },
  {
    category: "DESIGN SYSTEM",
    name: "rounded-xl sur modal (utiliser rounded-[Npx])",
    severity: "INFO",
    points: 0,
    regex: /\brounded-xl\b.*(?:modal|Modal)/g,
    detail: (m) => m.slice(0, 60).trim(),
  },
];

// ── Critères de score ─────────────────────────────────────────────────────────
// Score de cohérence thème : mesure la couverture en tokens CSS

const POSITIVE_INDICATORS = [
  { regex: /var\(--color-/g, label: "CSS vars utilisées", points: 1 },
  { regex: /var\(--blur-/g,  label: "Blur vars utilisées", points: 1 },
];

// ── Scan récursif ──────────────────────────────────────────────────────────

async function scanDir(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (EXCLUDE_PATTERNS.some((p) => fullPath.includes(p))) continue;
    if (entry.isDirectory()) {
      files.push(...(await scanDir(fullPath)));
    } else if (/\.(tsx?|css)$/.test(entry.name)) {
      files.push(fullPath);
    }
  }
  return files;
}

// ── Score calculation ─────────────────────────────────────────────────────────

function calcScore(results, files, positives) {
  const totalFiles  = files.length;
  const cleanFiles  = totalFiles - results.length;
  const critiques   = results.flatMap((r) => r.issues.filter((i) => i.severity === "CRITIQUE")).length;
  const warnings    = results.flatMap((r) => r.issues.filter((i) => i.severity === "AVERTISSEMENT")).length;
  const deductions  = results.flatMap((r) => r.issues).reduce((sum, i) => sum + (i.points || 0), 0);

  // Theme consistency: ratio fichiers propres
  const themeConsistency = Math.max(0, Math.round((cleanFiles / totalFiles) * 100));

  // Multi-theme readiness: pénalité sur critiques et dark: classes
  const darkClasses = results.flatMap((r) => r.issues.filter((i) => i.name.includes("dark:"))).length;
  const multiTheme  = Math.max(0, 100 - critiques * 5 - darkClasses * 3);

  // Design system coverage: CSS vars utilisées / total occurrences
  const cssVarUsage = positives;
  const dsScore     = Math.min(100, Math.max(0, cssVarUsage > 0 ? Math.round(Math.min(100, cssVarUsage / 10)) : 50));

  return { themeConsistency, multiTheme, dsScore, deductions, critiques, warnings };
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  if (!IS_JSON) {
    console.log("\n🔍  Audit thème — HeurGeo\n" + "=".repeat(50));
  }

  const files = await scanDir(SRC_DIR);
  const results = [];
  let totalCssVarUsage = 0;

  for (const filePath of files) {
    const content = await readFile(filePath, "utf8");
    const relPath = relative(ROOT, filePath);
    const fileIssues = [];

    for (const pattern of PATTERNS) {
      const lines = content.split("\n");
      for (let i = 0; i < lines.length; i++) {
        const matches = [...lines[i].matchAll(new RegExp(pattern.regex.source, "g"))];
        for (const match of matches) {
          fileIssues.push({
            severity: pattern.severity,
            category: pattern.category,
            name: pattern.name,
            line: i + 1,
            detail: pattern.detail(match[0]),
            points: pattern.points,
          });
        }
      }
    }

    // Comptage CSS vars positives
    for (const ind of POSITIVE_INDICATORS) {
      const matches = content.match(new RegExp(ind.regex.source, "g"));
      totalCssVarUsage += (matches?.length ?? 0) * ind.points;
    }

    if (fileIssues.length) {
      results.push({ file: relPath, issues: fileIssues });
    }
  }

  // ── Calcul scores ────────────────────────────────────────────────────────
  const scores = calcScore(results, files, totalCssVarUsage);
  const critiques = results.flatMap((r) => r.issues.filter((i) => i.severity === "CRITIQUE"));
  const warnings  = results.flatMap((r) => r.issues.filter((i) => i.severity === "AVERTISSEMENT"));
  const infos     = results.flatMap((r) => r.issues.filter((i) => i.severity === "INFO"));

  // ── Sortie JSON (CI/reporting) ───────────────────────────────────────────
  if (IS_JSON) {
    console.log(JSON.stringify({ scores, results, summary: {
      critiques: critiques.length,
      warnings: warnings.length,
      infos: infos.length,
      files: results.length,
      total: files.length,
    }}, null, 2));
    process.exit(critiques.length > 0 ? 1 : 0);
    return;
  }

  // ── Rapport lisible ──────────────────────────────────────────────────────
  for (const { file, issues } of results) {
    console.log(`\n📄 ${file}`);
    for (const issue of issues) {
      const icon = issue.severity === "CRITIQUE" ? "❌" : issue.severity === "AVERTISSEMENT" ? "⚠️ " : "ℹ️ ";
      console.log(`  ${icon} [L${issue.line}] ${issue.name}`);
      console.log(`     → ${issue.detail}`);
    }
  }

  console.log("\n" + "=".repeat(50));
  console.log("📊  Résumé :");
  console.log(`   ❌  Critiques    : ${critiques.length}`);
  console.log(`   ⚠️   Avertissements: ${warnings.length}`);
  console.log(`   ℹ️   Infos        : ${infos.length}`);
  console.log(`   📁  Fichiers concernés: ${results.length} / ${files.length}`);

  console.log("\n" + "=".repeat(50));
  console.log("🏆  Scores Design System :");
  console.log(`   🎨  Theme Consistency   : ${scores.themeConsistency}% ${badge(scores.themeConsistency)}`);
  console.log(`   🌗  Multi-theme Ready   : ${scores.multiTheme}%   ${badge(scores.multiTheme)}`);
  console.log(`   🧩  DS Coverage         : ${Math.min(100, Math.round(totalCssVarUsage / 15))}% ${badge(Math.min(100, Math.round(totalCssVarUsage / 15)))}`);
  console.log("");

  if (critiques.length > 0) {
    if (!IS_CI) console.log("❌  Des critiques doivent être corrigées avant le build.\n");
    process.exit(1);
  } else {
    console.log("✅  Aucun problème critique détecté !\n");
  }
}

function badge(score) {
  if (score >= 90) return "🟢";
  if (score >= 70) return "🟡";
  return "🔴";
}

main().catch((err) => {
  console.error("Erreur audit :", err);
  process.exit(2);
});
