# Refactoring — Ternaires darkMode

Audit du 09/05/2026 — Remplacement des ternaires `darkMode ? "classes-dark" : "classes-light"`
par des tokens CSS `var(--color-*)`.

> **Contexte** : Le projet utilise un système de tokens CSS (`neon.css` / `light.css`).
> Les ternaires JS fonctionnent visuellement mais contournent le système de tokens,
> rendant les futurs changements de thème plus difficiles.

---

## [HAUTE] Priorité haute — Visible sur toutes les pages

- [x] `AppNavBar.tsx` — 09/05/2026 — import useDarkMode supprimé, 2 borders → `--color-border-primary`, 6 boutons inactifs → `--color-text-muted`
- [x] `AppHeader.tsx` — 09/05/2026 — border, backdrop, bouton toggle, badge Pro, heure → tokens CSS. Emojis ☀️/🌙 → SVG inline. 1 ternaire résiduel ligne ~70 (badge version) — non bloquant

## [MOYEN] Priorité moyenne — Modals fréquentes ✅ TERMINÉ

- [x] `PatronModal.tsx` — 09/05/2026 — 13 remplacements
- [x] `LieuModal.tsx` — 09/05/2026 — 5 remplacements
- [x] `PatronSelector.tsx` — 09/05/2026 — 6 remplacements
- [x] `LieuSelector.tsx` — 09/05/2026 — 4 remplacements
- [x] `PatronsManager.tsx` — 09/05/2026 — 5 remplacements
- [x] `StatsCharts.tsx` — 09/05/2026 — 6 ternaires (dont 5 code mort)
- [x] `ImportMissionsModal.tsx` — 09/05/2026 — 3 variables locales supprimées + 9 ternaires → tokens CSS

## [BAS] Priorité basse — Refactoring pur (tabs complexes)

- [x] `LieuxManager.tsx` — 09/05/2026 — cls.split supprimé, 4 cards stats directs, 6 ternaires → tokens CSS
- [ ] `ParametresTab.tsx` — ~30 ternaires — chantier le plus important
- [ ] `AgendaTab.tsx` — ~15 ternaires
- [ ] `HistoriqueTab.tsx` — ~8 ternaires
- [ ] `BilanTab.tsx` — ~7 ternaires
- [ ] `SuiviTab.tsx` — ~3 ternaires
- [ ] `DonneesTab.tsx` — ~1 ternaire

---

## Déjà corrigés

- [x] `LieuxManager.tsx` — cls.split + 6 ternaires → tokens CSS (09/05/2026)
- [x] `ImportMissionsModal.tsx` — 3 variables locales + 9 ternaires → tokens CSS (09/05/2026)
- [x] `StatsCharts.tsx` — 6 ternaires → tokens CSS, darkMode supprimé des sous-composants (09/05/2026)
- [x] `LieuSelector.tsx` — 4 ternaires → tokens CSS (09/05/2026)
- [x] `PatronsManager.tsx` — 5 ternaires → tokens CSS (09/05/2026)
- [x] `PatronSelector.tsx` — 6 ternaires → tokens CSS (09/05/2026)
- [x] `LieuModal.tsx` — 5 ternaires → tokens CSS (09/05/2026)
- [x] `PatronModal.tsx` — 13 ternaires → tokens CSS (09/05/2026)
- [x] `AppHeader.tsx` — tokens CSS + SVG toggle (09/05/2026)
- [x] `AppNavBar.tsx` — import useDarkMode supprimé, borders + textes → tokens CSS (09/05/2026)
- [x] `MissionForm.tsx` — data-theme hardcodé → dynamique (09/05/2026)
- [x] `App.tsx` — data-theme déjà dynamique

---

## Notes

- Les ternaires **fonctionnent visuellement** — pas de bug, dette technique uniquement
- `ParametresTab` en dernier — complexe, risque de régression élevé
- Pattern de remplacement : `darkMode ? "bg-white/5" : "bg-slate-100"` → `className="bg-[var(--color-surface)]"`
