# Refactoring — Ternaires darkMode

Audit du 09/05/2026 — Remplacement des ternaires `darkMode ? "classes-dark" : "classes-light"`
par des tokens CSS `var(--color-*)`.

> **Contexte** : Le projet utilise un système de tokens CSS (`neon.css` / `light.css`).
> Les ternaires JS fonctionnaient visuellement mais contournaient le système de tokens,
> rendant les futurs changements de thème plus difficiles.

---

## VAGUE 1 — src/pages/ ✅ TERMINÉ 09/05/2026

- [x] `AppNavBar.tsx` — 1 ternaire badge version résiduel (non bloquant)
- [x] `AppHeader.tsx` — toggle UI conservé (fonctionnel, pas stylistique)
- [x] `PatronModal.tsx` — 13 remplacements
- [x] `LieuModal.tsx` — 5 remplacements
- [x] `PatronSelector.tsx` — 6 remplacements
- [x] `LieuSelector.tsx` — 4 remplacements
- [x] `PatronsManager.tsx` — 5 remplacements
- [x] `StatsCharts.tsx` — 6 ternaires
- [x] `ImportMissionsModal.tsx` — 3 variables locales + 9 ternaires
- [x] `LieuxManager.tsx` — cls.split supprimé + 6 ternaires
- [x] `DonneesTab.tsx` — 1 ternaire. darkMode conservé dans destructuring (passé aux enfants)
- [x] `SuiviTab.tsx` — useDarkMode supprimé, 3 ternaires
- [x] `BilanTab.tsx` — useDarkMode supprimé, 8 ternaires
- [x] `HistoriqueTab.tsx` — useDarkMode supprimé, 20 ternaires
- [x] `ParametresTab.tsx` — useDarkMode supprimé, 52 opérations

---

## VAGUE 2 — src/components/ 🔄 EN COURS

### HAUTE priorité

- [x] `ConfirmModal.tsx` — 09/05/2026 — 5 ternaires, darkMode retiré de l'interface
- [ ] `AcompteModal.tsx` — 4 ternaires
- [ ] `ClientModal.tsx` — 4 ternaires
- [ ] `FraisModal.tsx` — 3 ternaires
- [ ] `AgendaModal.tsx` — ~10 ternaires
- [ ] `PeriodModal.tsx` — ~10 ternaires
- [ ] `AgendaTab.tsx` — ~18 ternaires + classes hardcodées
- [ ] `AgendaWeekView.tsx` — ~9 ternaires
- [ ] `MissionForm.tsx` — 1 ternaire + bg-black/60 hardcodé (data-theme à évaluer)

### MOYENNE priorité

- [ ] `DashboardPanel.tsx` — usage darkMode à vérifier (Chart.js ?)
- [ ] `ClientsManager.tsx` — classes hardcodées fixes neon
- [ ] `ClientSelector.tsx` — classes hardcodées fixes neon
- [ ] `PatronsManager.tsx` — 2 classes hardcodées
- [ ] `PatronSelector.tsx` — 3 classes hardcodées

### BASSE priorité

- [ ] `BilanHeader.tsx` — classes hardcodées fixes neon (défaut true)
- [ ] `CustomAlert.tsx` — classes hardcodées (overlay, toujours sombre)
- [ ] `LieuSelector.tsx` — 3 classes hardcodées
- [ ] `DateSelector.tsx` — 2 classes hardcodées
- [ ] `DonneesTab.tsx` — 2 occurrences résiduelles
- [ ] `PatronModal.tsx` — classes hardcodées

### IGNORÉS (légitimes)

- `App.tsx` — data-theme fonctionnel, à conserver
- `DarkModeContext.tsx` — logique toggle, à conserver
- `AppHeader.tsx` — toggle UI, à conserver

---

## Notes techniques

- Pattern : `darkMode ? "bg-white/5" : "bg-slate-100"` → `className="bg-[var(--color-surface)]"`
- Classes neon intentionnelles (colorMap indigo/violet/yellow/teal/red/cyan) conservées
- `--color-surface-hover` = token existant pour hover bouton Annuler (pas `--color-surface-dynamic`)
- Aucune régression visuelle attendue