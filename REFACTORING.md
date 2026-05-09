# Refactoring — Ternaires darkMode

Audit du 09/05/2026 — Remplacement des ternaires `darkMode ? "classes-dark" : "classes-light"`
par des tokens CSS `var(--color-*)`.

> **Contexte** : Le projet utilise un système de tokens CSS (`neon.css` / `light.css`).
> Les ternaires JS fonctionnent visuellement mais contournent le système de tokens,
> rendant les futurs changements de thème plus difficiles.

---

## [HAUTE] Priorité haute — Visible sur toutes les pages

- [x] `AppNavBar.tsx` — 09/05/2026
- [x] `AppHeader.tsx` — 09/05/2026 — 1 ternaire résiduel badge version (non bloquant)

## [MOYEN] Priorité moyenne — Modals fréquentes ✅ TERMINÉ

- [x] `PatronModal.tsx` — 09/05/2026 — 13 remplacements
- [x] `LieuModal.tsx` — 09/05/2026 — 5 remplacements
- [x] `PatronSelector.tsx` — 09/05/2026 — 6 remplacements
- [x] `LieuSelector.tsx` — 09/05/2026 — 4 remplacements
- [x] `PatronsManager.tsx` — 09/05/2026 — 5 remplacements
- [x] `StatsCharts.tsx` — 09/05/2026 — 6 ternaires
- [x] `ImportMissionsModal.tsx` — 09/05/2026 — 3 variables locales + 9 ternaires

## [BAS] Priorité basse ✅ TERMINÉ (sauf ParametresTab)

- [x] `LieuxManager.tsx` — 09/05/2026 — cls.split supprimé + 6 ternaires
- [x] `DonneesTab.tsx` — 09/05/2026 — 1 ternaire. darkMode conservé dans destructuring (passé aux enfants)
- [x] `SuiviTab.tsx` — 09/05/2026 — useDarkMode supprimé, 3 ternaires
- [x] `BilanTab.tsx` — 09/05/2026 — useDarkMode supprimé, 8 ternaires
- [x] `HistoriqueTab.tsx` — 09/05/2026 — useDarkMode supprimé, 20 ternaires (+ darkMode={darkMode} retiré de StatsCharts)
- [ ] `ParametresTab.tsx` — ~30 ternaires — chantier final

---

## Notes

- Les ternaires **fonctionnent visuellement** — pas de bug, dette technique uniquement
- `ParametresTab` en dernier — complexe, risque de régression élevé
- `DonneesTab` : darkMode conservé dans le destructuring tant que les enfants acceptent la prop (inoffensif)
- Pattern de remplacement : `darkMode ? "bg-white/5" : "bg-slate-100"` → `className="bg-[var(--color-surface)]"`
