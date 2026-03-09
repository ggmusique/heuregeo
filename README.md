# Heures de Geo

**Application de gestion des heures de travail, bilans financiers et frais professionnels.**

Heures de Geo est une Progressive Web App (PWA) construite en React, pensee pour les travailleurs independants et prestataires de services. Elle permet de saisir des missions, suivre les heures travaillees, generer des bilans hebdomadaires/mensuels/annuels, gerer les acomptes, les frais divers, les frais kilometriques, et exporter des rapports professionnels en PDF, Excel ou CSV.

---

## Table des matieres

- [Fonctionnalites](#fonctionnalites)
- [Stack technique](#stack-technique)
- [Architecture du projet](#architecture-du-projet)
- [Installation et demarrage](#installation-et-demarrage)
- [Variables d'environnement](#variables-denvironnement)
- [Configuration Supabase](#configuration-supabase)
- [Onglets de l'application](#onglets-de-lapplication)
- [Systeme de roles et plans](#systeme-de-roles-et-plans)
- [Labels personnalisables](#labels-personnalisables)
- [Exports](#exports)
- [PWA et mode hors-ligne](#pwa-et-mode-hors-ligne)
- [CI/CD](#cicd)
- [Scripts utiles](#scripts-utiles)
- [Structure des fichiers](#structure-des-fichiers)
- [Aide-memoire Git](#aide-memoire-git)

---

## Fonctionnalites

### Gestion des missions
- Saisie rapide des missions : date, heure de debut/fin, pause, tarif horaire
- Calcul automatique de la duree et du montant
- Gestion des passages a minuit (ex : 22h00 - 02h00)
- Copie de la derniere mission pour saisie rapide
- Import en masse de missions
- Association a un patron, un client et un lieu

### Bilans financiers
- **Bilan hebdomadaire** : detail des missions, frais divers, frais km, acomptes, reste a percevoir
- **Bilan mensuel** (Pro) : synthese sur un mois complet
- **Bilan annuel** (Pro) : synthese sur une annee
- Historique des bilans passes
- Marquage "paye" avec suivi du statut de paiement
- Calcul des impayes reportes d'une periode a l'autre

### Acomptes
- Enregistrement des acomptes recus par patron
- Simulation de portefeuille : solde avant periode, acomptes verses, consommes, solde apres
- Deduction automatique sur les bilans

### Frais divers
- Ajout de frais ponctuels (materiel, deplacement, etc.)
- Association a un patron
- Integration dans les bilans

### Frais kilometriques
- Geocodage automatique des lieux via OpenStreetMap (Nominatim)
- Calcul de distance domicile-lieu (formule de Haversine)
- Bareme kilometrique configurable par pays (30 pays europeens supportes)
- Aller-retour automatique

### Agenda (Pro)
- Calendrier mensuel et vue semaine
- Creation/modification/suppression d'evenements
- Visualisation des jours travailles
- Notifications navigateur

### Generation de factures (Pro)
- Facture PDF professionnelle avec numero auto-incremente
- Coordonnees prestataire et client
- Detail des missions, frais divers, frais km
- Calcul TVA automatique (taux par pays europeen)
- Tampon "PAYE" si le bilan est solde

### Exports (Pro)
- **PDF** : rapport d'activite professionnel avec mise en page soignee
- **Excel** (.xlsx) : donnees structurees avec totaux
- **CSV** : compatible tableurs francais (separateur `;`, BOM UTF-8)

### Autres
- Mode sombre / clair avec persistance
- Authentification email/mot de passe via Supabase Auth
- Onboarding : formulaire de profil au premier lancement
- Mode "Viewer" : acces en lecture seule pour un patron
- Horloge en temps reel dans le header
- Mises a jour OTA (Over The Air) avec notification PWA

---

## Stack technique

| Couche         | Technologie                                                  |
| -------------- | ------------------------------------------------------------ |
| Framework      | [React 18](https://react.dev/) (JSX)                        |
| Bundler        | [Vite 5](https://vitejs.dev/)                               |
| Styles         | [Tailwind CSS 3](https://tailwindcss.com/)                  |
| Backend / BDD  | [Supabase](https://supabase.com/) (PostgreSQL + Auth + RLS) |
| PWA            | [vite-plugin-pwa](https://vite-pwa-org.netlify.app/) + Workbox |
| PDF            | [jsPDF](https://github.com/parallax/jsPDF) + jspdf-autotable |
| Excel          | [SheetJS (xlsx)](https://sheetjs.com/)                       |
| Geocodage      | [Nominatim](https://nominatim.org/) (OpenStreetMap)          |
| Police         | Playfair Display (Google Fonts)                              |

---

## Architecture du projet

L'application suit une architecture par domaine, avec une separation claire entre composants UI, logique metier (hooks), services API et utilitaires.

```
src/
  App.jsx                 # Composant racine, orchestration des onglets et modales
  main.jsx                # Point d'entree, AuthGate + rendu React

  components/
    auth/                 # AuthGate (login/signup), OnboardingForm
    agenda/               # AgendaModal
    client/               # ClientModal
    common/               # Composants reutilisables (ConfirmModal, CustomAlert,
                          #   UpdatePrompt, ViewerBadge, DateSelector, WeatherIcon)
      acompte/            # AcompteModal
      bilan/              # PeriodModal
      frais/              # FraisModal
    lieu/                 # LieuModal
    mission/              # ImportMissionsModal
    patron/               # PatronModal
    stats/                # Composants statistiques

  hooks/
    useClients.js         # CRUD clients
    useMissions.js        # CRUD missions + filtres par semaine/periode
    useFrais.js           # CRUD frais divers
    useAcomptes.js        # CRUD acomptes + calculs solde
    usePatrons.js         # CRUD patrons
    useLieux.js           # CRUD lieux
    useBilan.js           # Calcul et generation de bilans
    useHistorique.js      # Historique des bilans
    useProfile.js         # Profil utilisateur, roles, features
    useGeolocation.js     # Position GPS du navigateur
    useKmDomicile.js      # Frais km domicile-lieu
    useAgenda.js          # Evenements agenda
    useMissionForm.js     # Logique du formulaire de saisie mission
    useConfirm.js         # Modale de confirmation generique
    useTheme.js           # Gestion dark/light mode
    use*Modal.js          # Logique des modales (Frais, Acompte, Patron, Client, Lieu, Agenda)

  services/
    supabase.js           # Client Supabase (auth + DB)
    api/
      missionsApi.js      # Requetes Supabase pour les missions
      fraisApi.js         # Requetes Supabase pour les frais
      acomptesApi.js      # Requetes Supabase pour les acomptes
      lieuxApi.js         # Requetes Supabase pour les lieux

  lib/
    bilanEngine.js        # Regles de calcul bilan/acompte/impaye (fonctions pures)

  utils/
    calculators.js        # Calculs metier : duree, acomptes, haversine, solde
    dateUtils.js          # Manipulation de dates : semaine ISO, formatage FR
    exportUtils.js        # Export Excel, CSV (+ legacy PDF)
    exportPDF_Pro.js      # Export PDF professionnel (mise en page soignee)
    generateFacture.js    # Generation de factures PDF
    formatters.js         # Formatage euro, heures, dates
    geocode.js            # Geocodage via Nominatim (OpenStreetMap)
    kmSettings.js         # Helpers activation/desactivation frais km
    kmRatesByCountry.js   # Baremes km par pays europeen
    labels.js             # Labels UI personnalisables
    tvaRates.js           # Taux TVA par pays europeen (30 pays)
    suspectCoords.js      # Detection de coordonnees GPS suspectes

  constants/
    options.js            # Options predefinies (pauses, tarifs, heures, styles modales)

  contexts/
    LabelsContext.jsx     # Context React pour les labels personnalises

  styles.css              # Styles globaux Tailwind
  *.css                   # Correctifs CSS specifiques (time pickers, selects)
```

---

## Installation et demarrage

### Prerequis

- [Node.js](https://nodejs.org/) v18 ou superieur
- npm (inclus avec Node.js)
- Un projet [Supabase](https://supabase.com/) configure (voir section dediee)

### Installation

```bash
# Cloner le depot
git clone https://github.com/ggmusique/heuregeo.git
cd heuregeo

# Installer les dependances
npm install
```

### Configuration

Copier le fichier d'exemple et renseigner vos identifiants Supabase :

```bash
cp .env.example .env
```

Editer `.env` :

```env
VITE_SUPABASE_URL=https://votre-projet.supabase.co
VITE_SUPABASE_ANON_KEY=votre_anon_key_supabase
VITE_APP_CHANNEL=LOCAL
```

### Demarrage en mode developpement

```bash
npm run dev
```

L'application est accessible sur `http://localhost:5173`.

### Build de production

```bash
npm run build
```

Les fichiers sont generes dans le dossier `dist/`.

### Previsualisation du build

```bash
npm run preview
```

---

## Variables d'environnement

| Variable                 | Description                              | Obligatoire |
| ------------------------ | ---------------------------------------- | ----------- |
| `VITE_SUPABASE_URL`     | URL de votre projet Supabase             | Oui         |
| `VITE_SUPABASE_ANON_KEY`| Cle anonyme (anon key) Supabase          | Oui         |
| `VITE_APP_CHANNEL`      | Canal de l'app (`LOCAL`, `MAIN`, `WORK`) | Non         |

Les fichiers `.env.local`, `.env.main` et `.env.work` permettent de definir des configurations par environnement. Le fichier `.env` (non commite) est utilise en local.

---

## Configuration Supabase

### Tables principales

L'application utilise les tables Supabase suivantes (avec Row Level Security active) :

| Table               | Description                                      |
| ------------------- | ------------------------------------------------ |
| `profiles`          | Profil utilisateur (nom, prenom, adresse, features, role) |
| `missions`          | Missions saisies (date, horaires, patron, client, lieu, montant) |
| `frais_divers`      | Frais ponctuels (description, montant, date, patron) |
| `acomptes`          | Acomptes recus (montant, date, patron)           |
| `lieux`             | Lieux de mission (nom, adresse, coordonnees GPS) |
| `patrons`           | Patrons / employeurs (nom, couleur, coordonnees, facturation) |
| `clients`           | Clients (nom, coordonnees)                       |
| `bilans_status_v2`  | Suivi du statut de paiement des bilans           |
| `acompte_allocations` | Allocations d'acomptes sur les bilans          |
| `agenda_events`     | Evenements de l'agenda                           |

### Migrations SQL

Les scripts SQL sont disponibles dans le dossier `supabase/` :

- `migration_profiles.sql` : creation de la table `profiles` avec trigger auto-creation
- `migrations/` : migrations incrementales (roles viewer, facturation patrons, agenda, frais km, etc.)

### Securite (RLS)

- Chaque table utilise la Row Level Security de Supabase
- Les utilisateurs ne voient que leurs propres donnees (`auth.uid() = user_id`)
- Le role "viewer" a un acces restreint en lecture seule filtre par `patron_id`

---

## Onglets de l'application

### 1. Saisie
Formulaire principal pour enregistrer une mission :
- Date, heure de debut, heure de fin, pause
- Selection du patron, client et lieu (avec creation rapide via modale)
- Tarif horaire configurable
- Calcul automatique duree et montant
- Bouton "Copier derniere mission"
- Acces rapide pour ajouter frais et acomptes

### 2. Suivi
Deux sous-vues :
- **Bilan** : generation de bilans par semaine, mois ou annee avec detail des missions, frais, acomptes, frais km, reste a percevoir. Actions : marquer comme paye, exporter (PDF/Excel/CSV), generer une facture.
- **Historique** : liste des bilans passes avec filtrage par patron et onglets (bilans / acomptes)

### 3. Agenda (Pro)
Calendrier mensuel avec :
- Vue mois et vue semaine
- Indicateurs des jours travailles
- Creation/edition d'evenements
- Navigation temporelle

### 4. Parametres
- **Mon profil** : prenom, nom, adresse, telephone
- **Gestion des patrons** : ajout, edition, suppression (avec couleur et coordonnees de facturation)
- **Gestion des clients** : ajout, edition, suppression
- **Gestion des lieux** : ajout, edition, suppression, geocodage, regecodage batch
- **Frais kilometriques** : activation, domicile, bareme par pays
- **Labels personnalises** : renommer "Patron", "Client", "Lieu", "Mission"
- **Options d'affichage** : editeur de tarif par mission
- **Administration** : reconstruction des bilans (admin uniquement)

---

## Systeme de roles et plans

### Roles

| Role       | Description                                                    |
| ---------- | -------------------------------------------------------------- |
| `owner`    | Utilisateur standard, acces complet a ses propres donnees      |
| `viewer`   | Acces en lecture seule, filtre par un patron specifique         |
| `admin`    | Acces administration (`is_admin = true` dans la table profiles)|

### Plans

| Plan      | Acces                                                           |
| --------- | --------------------------------------------------------------- |
| Gratuit   | Saisie, bilan hebdomadaire, gestion basique                    |
| **Pro**   | Bilans mois/annee, exports PDF/Excel/CSV, agenda, factures, frais km, multi-patron |

Les features Pro sont controlees par le champ `features` (JSONB) dans la table `profiles` :

```json
{
  "plan": "pro",
  "bilan_mois": true,
  "bilan_annee": true,
  "export_pdf": true,
  "export_excel": true,
  "export_csv": true,
  "kilometrage": true,
  "agenda": true,
  "facture": true,
  "multi_patron": true,
  "viewer_enabled": true,
  "historique_complet": true
}
```

Chaque feature peut aussi etre activee individuellement (sans le plan Pro complet).

---

## Labels personnalisables

L'interface permet de renommer les entites metier via `profile.features.labels` :

| Cle        | Valeur par defaut | Exemple personnalise |
| ---------- | ----------------- | -------------------- |
| `patron`   | Patron            | Employeur            |
| `client`   | Client            | Entreprise           |
| `lieu`     | Lieu              | Chantier             |
| `mission`  | Mission           | Intervention         |

Les labels sont propages dans toute l'application via le `LabelsContext`.

---

## Exports

### PDF Professionnel (`exportPDF_Pro.js`)
- En-tete avec reference unique, periode et date de generation
- Section profil prestataire
- Cartes KPI (heures, CA, frais, reste a percevoir)
- Tableau des missions avec detail (date, client, lieu, horaires, duree, montant)
- Tableau des frais divers
- Tableau des frais kilometriques
- Section acomptes
- Recapitulatif final
- Tampon "PAYE" si applicable
- Pied de page

### Facture PDF (`generateFacture.js`)
- Numero auto-incremente (format `YYYY-NNN`)
- En-tete avec coordonnees prestataire et client
- Tableau des missions avec taux horaire
- Frais divers et frais km
- Sous-total HT, TVA (configurable par pays), Total TTC
- Echeance a 30 jours
- Tampon "PAYE" si le bilan est solde

### Excel
- Fichier `.xlsx` avec profil, missions, frais et totaux

### CSV
- Separateur `;` pour compatibilite Excel francais
- BOM UTF-8 pour les accents
- Option inclusion des frais divers

---

## PWA et mode hors-ligne

L'application est configuree comme Progressive Web App :

- **Installable** sur mobile (iOS et Android) et desktop
- **Service Worker** genere par Workbox via `vite-plugin-pwa`
- **Cache** : fichiers statiques (JS, CSS, HTML, images, polices) et Google Fonts
- **Mise a jour** : notification a l'utilisateur quand une nouvelle version est disponible (`UpdatePrompt`)
- **Mode standalone** : affichage plein ecran sans barre de navigateur
- **Icones** : 192x192 et 512x512 (maskable)

Configuration dans `vite.config.js` :
- `registerType: "prompt"` : l'utilisateur choisit quand mettre a jour
- `skipWaiting: false` : pas de mise a jour automatique en arriere-plan
- `devOptions: { enabled: true }` : PWA active aussi en mode dev

---

## CI/CD

### Auto-increment de version

Le workflow GitHub Actions (`.github/workflows/auto-version.yml`) incremente automatiquement la version patch a chaque push sur `main` :

- Incremente le champ `version` dans `package.json`
- Commit automatique avec le message `chore: bump version to X.Y.Z [skip ci]`
- Evite les boucles infinies grace au flag `[skip ci]`

### Versionnement

La version est injectee dans l'application via `vite.config.js` (`__APP_VERSION__`) et affichee dans le header.

---

## Scripts utiles

| Commande            | Description                                           |
| ------------------- | ----------------------------------------------------- |
| `npm run dev`       | Demarrer le serveur de developpement Vite (port 5173) |
| `npm run build`     | Construire l'application pour la production           |
| `npm run preview`   | Previsualiser le build de production                  |

### Scripts internes

| Fichier                        | Description                                    |
| ------------------------------ | ---------------------------------------------- |
| `scripts/gen-build-info.mjs`   | Genere les informations de build (pre-dev)     |
| `scripts/test-acomptes.mjs`    | Tests unitaires pour la logique des acomptes   |
| `scripts/test-bilanEngine.mjs` | Tests unitaires pour le moteur de bilan        |

---

## Structure des fichiers

```
heuregeo/
  .env.example            # Modele de configuration
  .env.local / .env.main / .env.work  # Config par environnement
  .eslintrc.json          # Configuration ESLint
  .github/workflows/      # CI/CD (auto-version)
  .gitignore
  .replit                 # Configuration Replit (dev cloud)
  .vscode/                # Settings VS Code
  backups/                # Sauvegardes
  docs/                   # Documentation technique (tests, specs)
  eslint.config.js        # Configuration ESLint (flat config)
  index.html              # Page HTML racine
  package.json            # Dependances et scripts npm
  postcss.config.js       # Configuration PostCSS (Tailwind)
  public/                 # Assets statiques (icones, manifest)
  scripts/                # Scripts utilitaires (build info, tests)
  src/                    # Code source de l'application
  supabase/               # Migrations SQL et configuration DB
  tailwind.config.js      # Configuration Tailwind CSS
  vite.config.js          # Configuration Vite (build, PWA, plugins)
  ANALYSE_CODE.md         # Analyse technique du code
```

---

## Aide-memoire Git

### Commandes courantes

| Objectif                                               | Commande                    | Ce que ca fait                                           |
| ------------------------------------------------------ | --------------------------- | -------------------------------------------------------- |
| Voir sur quelle branche tu es + etat des fichiers      | `git status`                | Te dit si tu es sur `main` ou `work`, et ce qui a change |
| Voir les branches                                      | `git branch`                | Liste toutes les branches, `*` = branche actuelle        |
| Passer sur la branche work (chantier)                  | `git checkout work`         | Bascule sur `work`                                       |
| Passer sur la branche main (stable)                    | `git checkout main`         | Bascule sur `main`                                       |
| Recuperer les changements du GitHub (branche actuelle)  | `git pull`                  | Met a jour ton Codespace depuis GitHub                   |
| Voir l'historique des commits (court)                  | `git log --oneline -n 10`   | Affiche les 10 derniers commits                          |
| Voir les differences avant de commit                    | `git diff`                  | Montre ce que tu as modifie                              |
| Ajouter tous les fichiers au commit                    | `git add .`                 | Prepare tout pour le commit                              |
| Commit (sauvegarde)                                    | `git commit -m "message"`   | Enregistre une etape dans l'historique                   |
| Envoyer sur GitHub                                     | `git push`                  | Publie tes commits sur GitHub                            |
| Creer une nouvelle branche chantier                    | `git checkout -b work2`     | Cree et va sur `work2`                                   |
| Mettre de cote temporairement (stash)                  | `git stash`                 | Range tes modifs sans les perdre                         |
| Recuperer ce que tu as stash                            | `git stash pop`             | Remet tes modifs stashees                                |
| Annuler tes modifs locales (dangereux)                 | `git restore .`             | Reviens a la derniere version commit                     |
| Revenir a un etat precedent (secours)                  | `git reflog`                | Te montre tout l'historique des actions                  |
| Creer un "point version" (tag)                         | `git tag v6.0`              | Met une etiquette sur le commit actuel                   |
| Envoyer les tags sur GitHub                            | `git push --tags`           | Publie tes tags                                          |

### Lancer l'application

| Objectif                 | Commande                         | Ce que ca fait                                |
| ------------------------ | -------------------------------- | --------------------------------------------- |
| Lancer l'app             | `npm install` puis `npm run dev` | Demarre le serveur Vite                       |
| Trouver le lien d'apercu | (Ports)                          | Onglet **Ports** > `5173` > "Open in Browser" |

### Routine de travail

1. **Travailler** sur la branche `work` :
   ```bash
   git checkout work
   # Modifier le code, tester avec npm run dev
   ```

2. **Sauvegarder** souvent :
   ```bash
   git status
   git add .
   git commit -m "WIP: amelioration en cours"
   git push
   ```

3. **Valider** quand tout fonctionne :
   ```bash
   git checkout main
   git merge work
   git tag v6.0
   git push
   git push --tags
   ```

4. **Repartir** travailler :
   ```bash
   git checkout work
   ```

> **Regle** : `work` = chantier, `main` = version propre, `tag` = photo officielle.
>
> A chaque demarrage de Codespace : `git pull origin main`

### Supabase : configuration

- `.env.example` : modele de configuration (reference)
- `.env` : configuration locale reelle utilisee par l'app en developpement

Si une variable Supabase change (URL ou cle), mettre a jour `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY` dans `.env`, puis redemarrer `npm run dev`.

Verification rapide :
```bash
cat .env
```

---

## Licence

Projet prive.
