# Analyse technique du code (version détaillée)

_Date : 2026-02-23_

## 1) Contexte et stack

- Application front-end en **React 18** avec **Vite 5**.
- Données persistées via **Supabase** (`@supabase/supabase-js`).
- Fonctionnalités orientées métier : missions, patrons, clients, lieux, frais, acomptes, bilan.

## 2) Constats vérifiés

### 2.1 Architecture fonctionnelle globalement bonne

- Le projet est organisé par domaines (`components/*`, `hooks/*`, `services/api/*`, `pages/*`).
- Cette structure facilite la lecture du code métier et limite le couplage UI / données.

### 2.2 Point critique principal : `App.jsx` joue trop de rôles

- `src/App.jsx` fait **528 lignes** et centralise :
  - navigation d'onglets,
  - état de nombreux formulaires,
  - orchestration des hooks,
  - ouverture/fermeture de modales,
  - gestion d'actions CRUD.
- Risques :
  - maintenance plus lente,
  - plus de régressions lors de modifications,
  - tests unitaires difficiles (composant trop orchestral).

### 2.3 Variables d'environnement Supabase non bloquantes

- Dans `src/services/supabase.js`, si `VITE_SUPABASE_URL` ou `VITE_SUPABASE_ANON_KEY` sont absentes, le code fait uniquement un `console.error`.
- Le client est ensuite quand même instancié.
- Risque : erreurs tardives et moins explicites à l'exécution.

### 2.4 Outils qualité pas encore branchés dans les scripts NPM

- `package.json` expose `dev`, `build`, `preview` mais pas `lint`/`test`.
- Risque : moins de garde-fous automatiques avant merge/deploy.

### 2.5 Signal performance bundle

- Le build de production passe, mais affiche un warning : chunk principal volumineux (> 500 kB minifié).
- Opportunité : découpage dynamique (`React.lazy`, `import()`), notamment pour les écrans peu fréquents (admin, exports, vues historiques lourdes).

## 3) Recommandations priorisées

## Priorité P1 (impact fort / effort modéré)

1. **Extraire l'orchestration de `App.jsx` par domaine**
   - Exemple : `useMissionController`, `useFraisController`, `useAcompteController`.
   - Objectif : réduire `App.jsx` à la composition et au routage d'état principal.

2. **Ajouter une validation stricte des variables d'env en dev**
   - Option simple : `throw new Error(...)` en environnement non production.
   - Bénéfice : erreurs immédiates et diagnostic plus simple.

3. **Introduire un script lint**
   - Ajouter `npm run lint` et l'exécuter en CI.

## Priorité P2 (impact progressif)

4. **Code-splitting des vues secondaires**
   - `React.lazy` + `Suspense` sur pages peu utilisées.

5. **Socle minimal de tests utilitaires**
   - Démarrer par `src/utils/calculators.js` et `src/utils/dateUtils.js`.

## 4) Plan d'exécution proposé (2 sprints courts)

### Sprint A

- Ajouter `lint` + config minimale.
- Commencer le découpage `App.jsx` sur **un seul domaine** (frais).

### Sprint B

- Étendre le découpage à missions/acomptes.
- Ajouter tests sur utilitaires de calcul/date.
- Mettre en place 1-2 imports dynamiques ciblés.

## 5) Commandes exécutées pour l'analyse

- `npm run build`
- `wc -l src/App.jsx src/services/supabase.js package.json README.md ANALYSE_CODE.md`
- `rg -n "TODO|FIXME|HACK|XXX" src README.md`
