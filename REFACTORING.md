# Refactoring — Ternaires darkMode

Audit du 09/05/2026 — Remplacement des ternaires `darkMode ? "classes-dark" : "classes-light"`
par des tokens CSS `var(--color-*)`.

> **Contexte** : Le projet utilise un système de tokens CSS (`neon.css` / `light.css`).
> Les ternaires JS fonctionnaient visuellement mais contournaient le système de tokens,
> rendant les futurs changements de thème plus difficiles.

---

## [HAUTE] Priorité haute — Visible sur toutes les pages ✅

- [x] `AppNavBar.tsx` — 09/05/2026
- [x] `AppHeader.tsx` — 09/05/2026 — 1 ternaire résiduel badge version (non bloquant)

## [MOYEN] Priorité moyenne — Modals fréquentes ✅

- [x] `PatronModal.tsx` — 09/05/2026 — 13 remplacements
- [x] `LieuModal.tsx` — 09/05/2026 — 5 remplacements
- [x] `PatronSelector.tsx` — 09/05/2026 — 6 remplacements
- [x] `LieuSelector.tsx` — 09/05/2026 — 4 remplacements
- [x] `PatronsManager.tsx` — 09/05/2026 — 5 remplacements
- [x] `StatsCharts.tsx` — 09/05/2026 — 6 ternaires
- [x] `ImportMissionsModal.tsx` — 09/05/2026 — 3 variables locales + 9 ternaires

## [BAS] Priorité basse ✅ TERMINÉ

- [x] `LieuxManager.tsx` — 09/05/2026 — cls.split supprimé + 6 ternaires
- [x] `DonneesTab.tsx` — 09/05/2026 — 1 ternaire. darkMode conservé dans destructuring (passé aux enfants)
- [x] `SuiviTab.tsx` — 09/05/2026 — useDarkMode supprimé, 3 ternaires
- [x] `BilanTab.tsx` — 09/05/2026 — useDarkMode supprimé, 8 ternaires
- [x] `HistoriqueTab.tsx` — 09/05/2026 — useDarkMode supprimé, 20 ternaires (+ darkMode={darkMode} retiré de StatsCharts)
- [x] `ParametresTab.tsx` — 09/05/2026 — useDarkMode supprimé, 52 opérations
  - Sidebar : 9 ternaires → tokens CSS
  - colorMap/colorMapLight → colorMap seul (3 occurrences)
  - Panneau principal : 5 ternaires → tokens CSS
  - extra-pro : 12 ternaires (4 cards neon fixes + textes + toggles)
  - Props : DonneesTab darkMode={false}, AdminPage darkMode={false}
  - LabelsPanel : interface darkMode supprimée + 7 ternaires → tokens CSS
  - KmSettingsPanel : interface darkMode supprimée + 14 ternaires → tokens CSS
  - Suspense fallbacks → text-[var(--color-text-muted)]

---

## ✅ REFACTORING TERMINÉ — 09/05/2026

Tous les fichiers ciblés ont été migrés.

### Fichiers avec darkMode résiduel (non bloquant)
- `AppHeader.tsx` — 1 ternaire badge version
- `DonneesTab.tsx` — darkMode conservé dans destructuring pour transmission aux enfants
- `AdminPage.tsx` — accepte encore darkMode={false} en prop, migration possible plus tard

### Notes techniques
- Pattern de remplacement : `darkMode ? "bg-white/5" : "bg-slate-100"` → `className="bg-[var(--color-surface)]"`
- Classes neon intentionnelles (colorMap indigo/violet/yellow/teal/red/cyan) conservées telles quelles
- Aucune régression visuelle attendue : les tokens CSS reflètent exactement les valeurs dark utilisées
