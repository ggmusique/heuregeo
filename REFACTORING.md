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

## [MOYEN] Priorité moyenne — Modals fréquentes

- [x] `PatronModal.tsx` — 09/05/2026 — 13 remplacements : inputCls, overlay, fond modal, container facturation, séparateur, 6 inputs inline, bloc aperçu, bouton Annuler → tokens CSS
- [ ] `LieuModal.tsx` — 3 ternaires (lignes 263, 278, 290) — inputs textarea
- [ ] `PatronSelector.tsx` — ~6 ternaires (lignes 46–47, 64, 128, 140, 143, 160) — sélection, dropdown, input
- [ ] `LieuSelector.tsx` — 4 ternaires (lignes 156, 175, 186, 205) — input, dropdown
- [ ] `PatronsManager.tsx` — ~5 ternaires (lignes 81, 98, 106, 168, 179) — cards, boutons
- [ ] `ImportMissionsModal.tsx` — ~8 ternaires (lignes 172–174, 198, 206, 222, 234, 237, 254, 267, 273)
- [ ] `StatsCharts.tsx` — 5 ternaires (ligne 40 + 4 inutiles identiques) — bg, border

## [BAS] Priorité basse — Refactoring pur (tabs complexes)

- [ ] `ParametresTab.tsx` — ~30 ternaires — chantier le plus important
- [ ] `AgendaTab.tsx` — ~15 ternaires
- [ ] `HistoriqueTab.tsx` — ~8 ternaires
- [ ] `BilanTab.tsx` — ~7 ternaires
- [ ] `SuiviTab.tsx` — ~3 ternaires
- [ ] `DonneesTab.tsx` — ~1 ternaire
- [ ] `LieuxManager.tsx` — ~6 ternaires (lignes 146, 179, 189, 194, 198, 220, 253, 264)

---

## Déjà corrigés

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
