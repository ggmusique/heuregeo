# Design System — HeurGeo

> Référence complète des tokens CSS, règles de style, et composants UI.  
> Dernière mise à jour : 2025

---

## 1. Principes fondamentaux

| Règle | Détail |
|-------|--------|
| **Pas de hex dans className** | Utiliser uniquement `var(--color-*)` |
| **Pas de `slate-` / `gray-`** | Remplacer par CSS vars |
| **Pas de `dark:` Tailwind** | Le thème vient de `DarkModeContext` via `data-theme` |
| **Pas de `darkMode` prop** | Déprécié dans tous les composants — ignorer |
| **Source de vérité** | `DarkModeContext` → `localStorage["app-theme"]` → `data-theme` sur `<html>` |

---

## 2. Thèmes disponibles

```ts
type AppTheme = "neon" | "oled" | "emerald" | "arctic";
```

| Thème | Mode | Couleur dominante |
|-------|------|-------------------|
| `neon` | Sombre | Cyan (#06b6d4) |
| `oled` | Sombre | Violet (#8b5cf6) |
| `emerald` | Sombre | Vert (#10b981) |
| `arctic` | Clair | Bleu froid (#3b82f6) |

---

## 3. Tokens CSS — Couleurs

### Surfaces & fonds

| Token | Usage |
|-------|-------|
| `--color-bg` | Fond de page principal |
| `--color-surface` | Cartes, modals, panneaux |
| `--color-surface-2` | Surface secondaire (légèrement plus claire) |
| `--color-surface-hover` | Hover sur éléments de surface |
| `--color-surface-offset` | Surface légèrement décalée (ex: bouton annuler) |
| `--color-field` | Fond des inputs / champs de formulaire |
| `--color-bg-input` | Alias pour les inputs |
| `--color-overlay` | Fond des overlays modaux (avec opacité) |

### Textes

| Token | Usage |
|-------|-------|
| `--color-text` | Texte principal |
| `--color-text-muted` | Texte secondaire / labels |
| `--color-text-faint` | Texte très atténué (week-ends, placeholders…) |
| `--color-text-dim` | Placeholder input |

### Bordures

| Token | Usage |
|-------|-------|
| `--color-border` | Bordures par défaut |
| `--color-border-cyan` | Bordure accent cyan (modals agenda) |

### Accents

| Token | Usage |
|-------|-------|
| `--color-accent-cyan` | Cyan (agenda, actions primaires en neon) |
| `--color-accent-violet` | Violet (état actif, boutons primaires) |
| `--color-accent-green` | Vert (succès, présence, earnings) |
| `--color-accent-amber` | Ambre (avertissements, km) |
| `--color-accent-red` | Rouge (erreurs, suppression) |
| `--color-accent-blue` | Bleu (météo, info) |
| `--color-accent-pink` | Rose (stats, graphiques) |

---

## 4. Tokens CSS — Effets

### Blur

| Token | Usage |
|-------|-------|
| `--blur-card` | Backdrop-blur des cartes glass |
| `--blur-modal` | Backdrop-blur des modals |
| `--blur-overlay` | Blur de l'overlay modal |
| `--blur-sm` | Blur léger |

### Ombres Tailwind (config)

| Classe | Usage |
|--------|-------|
| `shadow-modal` | Ombre des modals et panneaux flottants |
| `shadow-card` | Ombre des cartes |
| `shadow-glow-cyan` | Lueur cyan (éléments actifs neon) |
| `shadow-glow-violet` | Lueur violet |

---

## 5. Composants — Règles Glass

### Carte Glass

```tsx
<div className="bg-[var(--color-surface)] border border-[var(--color-border)] backdrop-blur-card rounded-2xl shadow-card">
```

### Modal Glass

```tsx
<div className="bg-[var(--color-surface)] border border-[var(--color-border)] backdrop-blur-modal rounded-3xl shadow-modal">
```

### Overlay modal

```tsx
<div className="fixed inset-0 bg-[var(--color-overlay)] backdrop-blur-[var(--blur-overlay)]">
```

### Input / champ

```tsx
<input className="bg-[var(--color-bg-input)] border border-[var(--color-border)] text-[var(--color-text)] placeholder:text-[var(--color-text-dim)] rounded-xl focus:border-[var(--color-accent-violet)]">
```

### Bouton primaire

```tsx
<button className="bg-[var(--color-accent-violet)] text-white rounded-xl px-4 py-2 hover:opacity-90">
```

### Bouton secondaire / annuler

```tsx
<button className="bg-[var(--color-surface-offset)] text-[var(--color-text-muted)] rounded-xl px-4 py-2 hover:opacity-80">
```

---

## 6. Composants UI génériques

### `<Modal>` — `src/components/ui/Modal.tsx`
- Overlay + panneau glass centrés
- Props : `isOpen`, `onClose`, `title`, `children`

### `<ConfirmModal>` — `src/components/common/ConfirmModal.tsx`
- Confirmation destructive (suppression)

### `<StatusBadge>` — `src/components/ui/`
- Affiche un statut coloré (success/warning/error/info)

### `<KPICard>` — `src/components/agenda/KPICard.tsx`
- Carte métrique avec valeur + label + icône

### `<Skeleton>` — `src/components/common/`
- État de chargement animé (pulse)

### `<CustomAlert>` — `src/components/common/CustomAlert.tsx`
- Alerte in-page (remplace `window.alert`)

---

## 7. Audit & contrôle qualité

```bash
# Audit interactif avec scores
node scripts/audit-theme.mjs

# Sortie JSON pour CI/reporting
node scripts/audit-theme.mjs --json

# En CI : exit 1 si des critiques sont trouvées
node scripts/audit-theme.mjs --ci
```

### Scores cibles

| Score | Seuil OK |
|-------|----------|
| Theme Consistency | ≥ 90% 🟢 |
| Multi-theme Ready | 100% 🟢 |
| DS Coverage | ≥ 80% 🟢 |
| Critiques | 0 ✅ |

### Fichiers exclus de l'audit (intentionnel)

- `designTokens.ts` — contient les tokens eux-mêmes
- `ThemeSelector.tsx` — contient des hex pour les swatches de prévisualisation
- `WeatherIcon.tsx` — SVG avec hex sémantiques (☀️🌧 — FCD34D, 93C5FD…)

---

## 8. DarkModeContext — API

```ts
import { useDarkMode } from "@/contexts/DarkModeContext";

const { theme, setTheme } = useDarkMode();
// theme: "neon" | "oled" | "emerald" | "arctic"
// setTheme: (t: AppTheme) => void
```

> **Ne jamais lire `darkMode` (boolean) pour des décisions de style.** Utiliser `data-theme` via CSS vars.

---

## 9. Checklist PR — Design System

Avant tout merge touchant au UI :

- [ ] Aucun `#XXXXXX` dans les classNames
- [ ] Aucun `rgba()` dans les classNames
- [ ] Aucun `bg-slate-*` / `text-gray-*` hardcodés
- [ ] Aucun `dark:` prefix Tailwind
- [ ] Aucun prop `darkMode` ajouté (tous dépréciés)
- [ ] `node scripts/audit-theme.mjs` → 0 critiques
- [ ] Test visuel sur au moins 2 thèmes (neon + arctic)
