# Analyse de refactoring — 2026-04-26

## Méthode rapide

- Revue structurelle du projet React/Vite (hooks, pages, composants, utils).
- Identification des zones les plus volumineuses (fichiers > 500 lignes) comme candidats prioritaires.
- Lecture ciblée de `App.jsx`, `useBilan.js` et `DiagnosticsPage.jsx` pour identifier les couplages et responsabilités mélangées.

## Hotspots prioritaires

### 1) `src/App.jsx` (composition trop large)

**Constats**
- `App` centralise énormément d'orchestration : hooks métiers, permissions, modales, navigation, états UI, chargements et effets globaux.
- La fonction assemble de très nombreux hooks et callbacks (mission, frais, acomptes, bilan, agenda, modales), ce qui complexifie les tests et la maintenance.

**Impact**
- Risque élevé de régression lors des changements transverses.
- Temps de lecture important pour comprendre les dépendances entre modules.

**Refactoring conseillé**
- Extraire un `useAppShell()` (ou `useAppController()`) qui retourne un modèle de vue structuré : `navigation`, `loadingState`, `permissions`, `modalState`, `actions`.
- Découper le rendu principal en sous-composants :
  - `AppLayout` (chrome global + thème + overlay loading)
  - `AppNavigation`
  - `AppModals`
  - `AppContentRouter`

---

### 2) `src/hooks/useBilan.js` (logique métier + I/O + mapping UI)

**Constats**
- Le hook mélange logique financière, calculs kilométriques, requêtes Supabase, formatage d'affichage et enrichissements météo.
- Plusieurs responsabilités cohabitent dans un seul module, ce qui rend l'évolution risquée.

**Impact**
- Difficile de tester isolément (calcul pur vs accès données).
- Faible réutilisabilité des règles métier dans d'autres écrans (dashboard/diagnostics/export).

**Refactoring conseillé**
- Isoler 3 couches nettes :
  1. `services/bilanRepository.js` (accès Supabase uniquement)
  2. `domain/bilanCalculations.js` (calculs purs et déterministes)
  3. `hooks/useBilan.js` (orchestration UI + état React)
- Déplacer `fetchHistoricalWeather` dans `services/weatherService.js` avec cache en mémoire simple (`Map` par `dateIso`).
- Introduire des DTO explicites (`BilanPeriod`, `BilanSummary`, `BilanStatusRow`) pour clarifier les entrées/sorties.

---

### 3) `src/pages/DiagnosticsPage.jsx` (vue admin monolithique)

**Constats**
- La page combine à la fois affichage, diagnostic financier, exécution d'actions admin, feedback UI et logique d'anomalies.
- Nombre élevé d'états locaux et handlers, ce qui augmente la charge cognitive.

**Impact**
- Difficile à faire évoluer sans casser le flux UX.
- Peu favorable aux tests unitaires sur les règles de diagnostic.

**Refactoring conseillé**
- Segmenter en sous-modules :
  - `diagnostics/useDiagnosticsActions.js`
  - `diagnostics/useFinanceDiagnostic.js`
  - composants de section (`SystemHealthCard`, `FinanceDiagnosticCard`, `MaintenanceActionsCard`).
- Conserver la page comme simple orchestrateur de sections.


## Pré-requis recommandé : tests avant refactoring

Oui — excellente remarque. Comme *tout fonctionne aujourd'hui*, il faut poser un **filet de sécurité** avant de toucher à l'architecture.

### Approche pragmatique (sans gros chantier initial)

1. **Tests unitaires sur le cœur métier** (priorité haute)
   - Cibler d'abord les fonctions déjà extractibles : calcul d'impayé, statut payé/non payé, conversions de période, allocations d'acomptes.
   - Objectif : figer les règles actuelles telles qu'elles se comportent aujourd'hui.

2. **Tests d'intégration légers** sur les hooks critiques
   - Valider les cas principaux de `useBilan` avec des données mockées (sans dépendre de Supabase réel).
   - Vérifier les invariants : pas de régression sur `reste_a_percevoir`, `acompte_consomme`, `paye`.

3. **Scénarios E2E minimaux** (happy paths)
   - 3 à 5 parcours stables : création mission, génération bilan, marquer comme payé, export.
   - But : détecter les cassures UX majeures pendant la refacto.

### Critère “go refactor”

- On démarre les refactors **uniquement après** :
  - un socle de tests verts sur les règles bilan critiques,
  - quelques scénarios E2E de non-régression,
  - un pipeline CI qui exécute ces tests automatiquement.

### Ajustement du plan

- Ajouter un **Lot 0 — Test harness** avant Lot A/B/C :
  - outillage de test,
  - premiers tests de non-régression,
  - baseline de couverture sur le domaine bilan.

## Plan par lots (ordre recommandé)

### Lot 0 — Socle de tests (avant refactoring)
- Mettre en place l'outillage de tests (unitaires + intégration + E2E minimal).
- Couvrir en priorité les règles bilan critiques avant tout déplacement de code.
- Exécuter ces tests en CI pour bloquer les régressions pendant la refonte.

### Lot A — Gains rapides (1 à 2 jours)
- Extraire des utilitaires purs depuis `useBilan` et `DiagnosticsPage` sans changer les comportements.
- Centraliser les chaînes de message d'action dans une constante (`src/constants/messages.js`).
- Introduire un helper commun pour états `loading + error + success` des actions async.

### Lot B — Architecture intermédiaire (3 à 5 jours)
- Créer `repositories` (Supabase) + `domain` (calculs) pour le flux bilan.
- Réduire `App.jsx` à un shell de composition en déplaçant l'orchestration dans un hook dédié.
- Déplacer les modales dans `components/app-shell/modals/*`.

### Lot C — Stabilisation et qualité (2 à 3 jours)
- Ajouter tests unitaires sur les fonctions pures (calcul impayés, acomptes, périodes, statuts).
- Ajouter tests de non-régression sur les conversions de périodes et allocations.
- Ajouter métriques CI simples (taille max de fichier, lint sur complexité cyclomatique si activable).

## Indicateurs de réussite

- Aucun fichier UI principal > 700 lignes.
- `useBilan` < 450 lignes avec > 70% de logique déplacée vers `domain/` et `services/`.
- Diminution des effets React couplés dans `App.jsx`.
- Couverture de tests des règles bilan critiques (impayé, paye, acompte consommé, reste à percevoir).

## Backlog concret (tickets suggérés)

1. `test: setup harness (unit/integration/e2e) and CI baseline`
2. `refactor(app): extract App shell controller and modal registry`
3. `refactor(bilan): split repository/domain/hook layers`
4. `refactor(diagnostics): split page into hooks and section components`
5. `test(bilan): add unit tests for payment status and allocations`
6. `chore(ci): add file-size guardrails for src/pages and src/hooks`

