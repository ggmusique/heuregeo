# AGENTS.md

## Status

✅ Active

---

# heuregeo — Repository Constitution

Ce fichier définit les règles obligatoires pour tous les agents IA, développeurs et contributions futures.

L’objectif est de préserver :

* la stabilité,
* la cohérence visuelle,
* la maintenabilité,
* la sécurité,
* la qualité architecture,
* la cohérence multi-thème,
* la qualité produit SaaS premium.

---

# 1. Philosophie du projet

heuregeo n’est PAS :

* un template admin,
* une démo React,
* un dashboard Tailwind classique,
* un projet expérimental.

heuregeo DOIT rester :

* premium,
* moderne,
* sobre,
* élégant,
* cohérent,
* glass/OLED,
* multi-thème,
* maintenable,
* production-ready.

Inspirations UI :

* Linear
* Vercel
* Raycast
* Arc Browser
* Stripe Dashboard

INTERDIT :

* look “dashboard 2023”
* gradients legacy agressifs
* glow RGB gaming
* animations flashy
* composants incohérents
* retour du legacy indigo/or

---

# 2. Architecture technique

Stack principale :

* React
* Vite
* TypeScript
* TailwindCSS
* Supabase
* Vitest
* Playwright

Architecture actuelle :

* design system centralisé
* système multi-thème stable
* monitoring actif
* sécurité RLS renforcée
* audit tooling
* UI tokenisée

IMPORTANT :
Ne jamais créer de système parallèle.

INTERDIT :

* second système thème
* second système UI
* second système modal
* second système design tokens
* second système loading

Toujours réutiliser les systèmes existants.

---

# 3. Multi-thème — Règles absolues

Thèmes actifs :

* neon
* oled
* emerald
* arctic

TOUS les composants doivent être compatibles avec les 4 thèmes.

Avant toute modification UI :

* tester mentalement les 4 thèmes,
* vérifier contrastes,
* vérifier hover,
* vérifier lisibilité,
* vérifier glow,
* vérifier surfaces.

INTERDIT :

* dark:
* couleurs hardcodées
* variantes thème parallèles
* conditions darkMode legacy

UTILISER :

* CSS vars
* colorTokens
* surfaces tokenisées
* accents dynamiques.

---

# 4. Règle absolue — Opportunistic Cleanup

Quand un fichier est modifié :

SI un agent voit :

* une couleur hardcodée,
* un bg-indigo-*,
* un text-indigo-*,
* un gradient legacy,
* un dark:,
* un rgba inline,
* un hex,
* un vieux bouton,
* une ancienne card,
* une incohérence spacing,
* une incohérence glass,
* un composant legacy,
* un import inutile,
* un code mort,

ALORS :

* il DOIT corriger dans la même passe,
  OU
* documenter explicitement pourquoi ce n’est pas modifié.

Même si ce n’était PAS la tâche principale.

---

# 5. Design System Rules

Le design system est obligatoire.

UTILISER :

* composants UI centraux
* CSS vars
* design tokens
* spacing cohérent
* surfaces glass cohérentes
* radius cohérents
* transitions ciblées
* glow subtil
* overlays cohérents.

INTERDIT :

* composants UI hors système
* nouvelles cards legacy
* nouveaux styles inline critiques
* nouvelles couleurs hardcodées
* nouvelles shadows incohérentes
* nouveaux systèmes spacing.

---

# 6. Glassmorphism Rules

Le glassmorphism doit rester :

* subtil,
* premium,
* lisible,
* performant.

INTERDIT :

* glow excessif
* blur excessif
* blur imbriqués multiples
* surfaces illisibles
* overlays opaques incohérents
* contrastes faibles.

OBJECTIF :
Style premium mature.
Pas d’effets flashy.

---

# 7. UI Consistency Rules

Tous les composants doivent conserver :

* même logique spacing,
* même logique radius,
* même logique hover,
* même logique transitions,
* même logique typography,
* même logique depth.

Vérifier systématiquement :

* alignements,
* padding,
* marges,
* hiérarchie visuelle,
* cohérence des boutons,
* cohérence des KPI,
* cohérence des tableaux,
* cohérence des modals.

---

# 8. Performance Rules

INTERDIT :

* transition-all
* backdrop-blur imbriqués inutiles
* rerenders inutiles
* animations coûteuses
* glow lourds
* shadows énormes.

PRIVILÉGIER :

* transition-colors
* transition-opacity
* transition-transform ciblés
* hover subtil
* animations légères.

---

# 9. Sécurité — Règles absolues

La sécurité est prioritaire.

TOUJOURS :

* vérifier auth côté serveur
* vérifier user_id
* respecter RLS
* respecter isolation stricte des données
* utiliser validateOrigin strict
* sanitiser les erreurs
* éviter enumeration utilisateurs.

INTERDIT :

* confiance frontend seule
* accès cross-user
* bypass RLS
* secrets hardcodés.

---

# 10. Monitoring & Santé

Le monitoring fait partie du produit.

Ne jamais casser :

* page Santé 🛡️
* audit logs
* monitoring
* error boundaries
* captureError
* métriques santé.

---

# 11. Repository Hygiene

Le repository doit rester propre.

INTERDIT :

* fichiers zombies
* previews abandonnées
* artefacts debug
* docs obsolètes à la racine
* composants morts
* hooks inutilisés
* imports inutiles.

TOUJOURS :

* archiver les docs historiques
* supprimer le code mort sûr
* garder structure claire.

---

# 12. Documentation Rules

Documentation active :
/docs

Structure recommandée :

* architecture
* design-system
* security
* deployment
* monitoring
* archive

Toutes les docs doivent avoir un statut :

Exemple :

```md
# Status
✅ Active
```

OU

```md
# Status
📦 Archived
```

---

# 13. Tests Obligatoires

Avant toute livraison importante :

Exécuter :

```bash
npm run build
npm test
node scripts/audit-theme.mjs
```

OBJECTIFS :

* 0 critique audit
* 0 avertissement critique
* build vert
* tests verts.

---

# 14. Workflow Git

TOUJOURS :

* commits propres
* commits atomiques
* séparer features et cleanup
* séparer refactor et UI.

Exemples :

```bash
git commit -m "feat(ui): improve agenda KPI premium cards"
```

```bash
git commit -m "chore(repo): cleanup stale files and archive legacy docs"
```

---

# 15. Refactoring Rules

INTERDIT :

* gros refactors dangereux inutiles
* réécriture massive sans nécessité
* migration brutale.

PRIVILÉGIER :

* migration progressive
* refactor safe
* stabilisation continue
* dette réduite progressivement.

---

# 16. Cleanup Rules

Avant suppression d’un fichier :

* vérifier imports
* vérifier lazy loading
* vérifier tests
* vérifier tooling
* vérifier runtime.

En cas de doute :

* archiver plutôt que supprimer.

---

# 17. Audit Theme

Le script suivant fait partie du workflow officiel :

```bash
node scripts/audit-theme.mjs
```

Le script détecte :

* hardcoded colors
* legacy indigo
* transition-all
* problèmes glass
* violations design system.

Aucune nouvelle critique ne doit être introduite.

---

# 18. Qualité attendue

Le projet doit conserver une qualité :

* premium,
* moderne,
* cohérente,
* maintenable,
* scalable,
* production-ready.

L’objectif est une vraie application SaaS professionnelle.

---

# 19. Règle finale

Quand un agent modifie le projet :

Il ne doit PAS seulement :

* “faire fonctionner”.

Il doit aussi :

* préserver la cohérence,
* préserver la qualité,
* préserver l’architecture,
* préserver l’identité visuelle,
* préserver la maintenabilité long terme.

Chaque modification doit laisser le projet :

* aussi propre,
* ou plus propre,
  qu’avant la modification.
