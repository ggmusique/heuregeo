# Analyse technique du code (mise à jour)

_Date : 2026-02-24_

## 1) Contexte et stack

- Front-end en **React 18** avec **Vite 5**.
- Persistance via **Supabase** (`@supabase/supabase-js`).
- Domaine fonctionnel orienté gestion d’activité : missions, patrons, clients, lieux, frais, acomptes et bilan.

## 2) Points positifs observés

1. **Structure projet claire par domaines**
   - Le code est séparé entre `components`, `hooks`, `services/api`, `pages`, `utils`.
   - Cette organisation rend la navigation lisible et aide à isoler les responsabilités.

2. **Build de production fonctionnel**
   - La commande de build passe sans erreur bloquante.
   - La génération PWA est active et produit les assets attendus (`sw.js`, `workbox-*.js`).

3. **Base fonctionnelle déjà riche**
   - Le périmètre métier est complet (CRUD + synthèse + export), ce qui montre une bonne maturité fonctionnelle.

## 3) Risques / dettes techniques prioritaires

### 3.1 `App.jsx` trop central (priorité haute)

- `src/App.jsx` fait **528 lignes**.
- Il concentre orchestration métier, état UI, modales et composition globale.
- Effets secondaires possibles :
  - augmentation du risque de régression,
  - difficulté de tests unitaires,
  - vitesse de maintenance réduite à chaque évolution.

### 3.2 Robustesse de config Supabase (priorité haute)

- `src/services/supabase.js` lit les variables d’environnement puis instancie le client.
- En cas de variables manquantes, le comportement actuel n’empêche pas forcément des erreurs tardives côté runtime.
- Recommandation : fail fast en développement (message explicite + arrêt) pour éviter des bugs diffus.

### 3.3 Qualité outillée incomplète (priorité moyenne)

- `package.json` ne contient pas de script `lint` ni `test`.
- Sans commande standardisée de vérification, il est plus difficile d’automatiser le contrôle qualité avant merge/deploy.

### 3.4 Performance bundle (priorité moyenne)

- Le build signale un chunk principal de **~896 kB minifié** (`index-*.js`), au-dessus du seuil d’avertissement Vite (500 kB).
- Risque : temps de chargement initial plus élevé sur connexions modestes.
- Piste : code-splitting des écrans secondaires (`React.lazy`, imports dynamiques).

## 4) Recommandations concrètes (ordre conseillé)

### P1 — Sécuriser et découper

1. **Découper `App.jsx` en sous-contrôleurs/hooks d’orchestration**
   - Exemples : `useMissionsController`, `useFraisController`, `useAcomptesController`.
   - Objectif : garder `App.jsx` comme point de composition plutôt que centre de logique.

2. **Durcir la validation de la config Supabase en dev**
   - Validation stricte au démarrage avec erreur explicite si URL/clé absente.

3. **Ajouter scripts qualité dans `package.json`**
   - `lint` (ESLint)
   - `test` (même minimal au départ)

### P2 — Optimiser progressivement

4. **Appliquer du lazy loading sur les vues peu fréquentes**
   - Exemple : administration, historique lourd, exports.

5. **Ajouter des tests unitaires ciblés sur utilitaires critiques**
   - Démarrer par `utils/calculators.js` et `utils/dateUtils.js`.

## 5) Commandes exécutées pour cette analyse

- `npm run build`
- `git status --short`
- `git branch --show-current`
- `wc -l src/App.jsx src/services/supabase.js package.json ANALYSE_CODE.md`
- `rg -n "TODO|FIXME|HACK|XXX" src README.md ANALYSE_CODE.md`
