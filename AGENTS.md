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

---

# 20. Acomptes — Règles absolles (NOUVEAU)

**Contexte** : Les bugs récurrents sur les acomptes (user_id NULL, unapply cassant multi-acompte, semaines payées non marquées) ont causé des pertes de temps majeures. Ces règles sont **non négociables**.

## 20.1. Schéma & Données — Tables `acomptes` & `acompte_allocations`

| Règle | Description |
|-------|-------------|
| **R20.1.1** | `acomptes.user_id` **DOIT** avoir `DEFAULT auth.uid()` — jamais de NULL possible à l'insert |
| **R20.1.2** | Toute `INSERT` sur `acomptes` **DOIT** inclure `user_id` explicitement (API) — *defense in depth* |
| **R20.1.3** | `acompte_allocations` **DOIT** avoir `patron_id`, `user_id`, `periode_type`, `periode_index` — traçabilité complète |
| **R20.1.4** | `acompte_allocations.amount` = source de vérité (pas `montant_applique` legacy) |
| **R20.1.5** | Index unique sur `(acompte_id, bilan_id)` — idempotence garantie |

## 20.2. RPC `apply_acompte` — Distribution

| Règle | Description |
|-------|-------------|
| **R20.2.1** | `SECURITY DEFINER` + `SET search_path = public` — obligatoire |
| **R20.2.2** | **Ownership check** : `WHERE id = p_acompte_id AND user_id = auth.uid() FOR UPDATE` — refuse si pas owner |
| **R20.2.3** | **Idempotent** : `DELETE` allocations existantes → rollback bilans → recalcul complet |
| **R20.2.4** | **Ordre** : semaines les plus anciennes d'abord (`periode_index ASC`) |
| **R20.2.5** | **Capping** : ne dépasse jamais `acompte.montant` (assertion `SUM(amount) <= montant`) |
| **R20.2.6** | Marque `paye = true` + `date_paiement = now()` **SEULEMENT** si `v_alloue >= v_besoin` (semaine entièrement couverte) |
| **R20.2.7** | Rollback interne **PROTÈGE** les semaines déjà payées par d'autres acomptes : `AND COALESCE(b.paye, false) = false` |

## 20.3. RPC `unapply_acompte` — Annulation (CRITIQUE multi-acompte)

| Règle | Description |
|-------|-------------|
| **R20.3.1** | Même ownership check que `apply_acompte` |
| **R20.3.2** | **NE MET PAS** `paye = false` aveuglément — **vérifie d'abord** |
| **R20.3.3** | Logique : après soustraction, si `acompte_consomme - amount >= ca_brut_periode` → **garde `paye = true`** (autre acompte couvre encore) |
| **R20.3.4** | Sinon → `paye = false`, `date_paiement = NULL`, `reste_a_percevoir += amount` |
| **R20.3.5** | Pas de condition `paye = false` dans le `WHERE` — doit pouvoir annuler même des semaines payées |

## 20.4. API Frontend (`acomptesApi.ts`)

| Règle | Description |
|-------|-------------|
| **R20.4.1** | `createAcompte` : **TOUJOURS** `const { user } = await supabase.auth.getUser(); insert({ ...data, user_id: user.id })` |
| **R20.4.2** | `deleteAcompte` : appelle `unapply_acompte` **AVANT** `DELETE` — ordre strict |
| **R20.4.3** | `applyAcompte` / `unapplyAcompte` : wrappers simples sur RPC, **pas de logique métier** |

## 20.5. Hook `useAcomptes` — Calculs

| Règle | Description |
|-------|-------------|
| **R20.5.1** | `getSoldeAvant(dateRef)` : **strictement `< dateRef`** (pas `<=`) — wallet simulation |
| **R20.5.2** | `getAcomptesDansPeriode(debut, fin)` : **inclusif** `[debut, fin]` |
| **R20.5.3** | `getTotalAcomptesJusqua(dateFin)` : `<= dateFin` — pour couvrir impayés antérieurs |
| **R20.5.4** | Tous les calculs **jamais négatifs** : `Math.max(0, ...)` |
| **R20.5.5** | Filtre `patron_id` **systématique** si fourni — isolation données |

## 20.6. Calculateurs purs (`utils/calculators.ts`)

| Règle | Description |
|-------|-------------|
| **R20.6.1** | `calculerSoldeAcomptesAvant` : events triés par date, simulation porte-monnaie (acompte = +, mission/frais = -) |
| **R20.6.2** | `calculerAcomptesBilan` : retourne `{ acomptes_verses, acomptes_consommes, solde_avant, solde_apres }` |
| **R20.6.3** | `solde_apres = max(0, solde_avant + acomptes_verses - min(disponible, ca_brut))` — borne à 0 |

## 20.7. Tests obligatoires (vitest)

| Test | Scénario |
|------|----------|
| **T20.7.1** | Acompte unique couvre plusieurs semaines → toutes `paye = true` |
| **T20.7.2** | **Multi-acompte** : A1 paie S1, A2 paie S2 → suppression A1 ne casse pas S2 (`paye` reste `true`) |
| **T20.7.3** | Acompte partiel → semaine `paye = false`, `reste_a_percevoir > 0` |
| **T20.7.4** | `getSoldeAvant` exclut dateRef (strict `<`) |
| **T20.7.5** | `calculerAcomptesBilan` : solde_avant + acomptes_verses ≥ acomptes_consommes |
| **T20.7.6** | `unapply_acompte` idempotent : double appel = aucun effet de bord |

## 20.8. Diagnostic & Réparation (page Santé / Diagnostics)

| Règle | Description |
|-------|-------------|
| **R20.8.1** | Page Santé **DOIT** détecter : `paye = true` mais `reste_a_percevoir > 0.01` → anomalie critique |
| **R20.8.2** | Page Santé **DOIT** détecter : acomptes sans allocation → warning |
| **R20.8.3** | Page Santé **DOIT** détecter : acomptes sur-alloués (`SUM(amount) > montant`) → critique |
| **R20.8.4** | Migration de réparation **IDempotente** : `WHERE paye IS DISTINCT FROM true AND reste_a_percevoir = 0 AND acompte_consomme >= ca_brut_periode` |

## 20.9. Interdictions absolues

| Interdiction | Raison |
|--------------|--------|
| ❌ `INSERT` sur `acomptes` sans `user_id` | Cause #1 des bugs (RLS + ownership check échoue) |
| ❌ `unapply_acompte` sans vérification `ca_brut_periode` | Cause #2 : casse semaines payées par autres acomptes |
| ❌ `apply_acompte` sans `FOR UPDATE` | Race condition possible |
| ❌ Calculs côté frontend qui font confiance aux données DB sans revérification | Source de vérité = DB + calculateurs purs |
| ❌ Modifier `apply_acompte` / `unapply_acompte` sans faire passer **TOUS** les tests T20.7.x | Régression garantie |

## 20.10. Checklist avant commit touchant aux acomptes

- [ ] Migration SQL si schéma/RPC modifiés
- [ ] `npm test` → 63/63 verts (inclut T20.7.x)
- [ ] `node scripts/audit-theme.mjs` → 0 critique
- [ ] Vérifier `acomptesApi.ts` passe `user_id`
- [ ] Vérifier `unapply_acompte` a la logique `CASE ... ca_brut_periode`
- [ ] Documentation mise à jour si nouvelle règle
