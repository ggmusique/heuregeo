# Revue sécurité (rapide)

_Date : 2026-02-24_

## Vérifications effectuées

- Build applicatif (`npm run build`) pour vérifier l'intégrité de compilation.
- Recherche de secrets/config sensibles dans le repo (`rg` sur patterns clés).
- Vérification de l'hygiène Git (`git ls-files`, `.gitignore`).
- Relecture ciblée de la logique auth/RLS dans les hooks Supabase (`useBilan`, `missionsApi`, `useProfile`).

## Résultats

### 1) Exposition de variables d'environnement dans le dépôt (corrigé)

- Le fichier `.env` était versionné dans Git.
- Action appliquée :
  - ajout de règles `.env`/`.env.*` dans `.gitignore` (avec exception `.env.example`),
  - retrait de `.env` de l'index Git (`git rm --cached .env`).

### 2) Initialisation Supabase sans fail-fast (corrigé)

- Le client Supabase était instancié même si `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` manquaient.
- Action appliquée :
  - en mode dev, lancement d'une erreur explicite,
  - en prod, log d'erreur conservé.

### 3) Dépendances

- `npm audit` n'a pas pu être exploité dans cet environnement (endpoint npm `403 Forbidden`).
- Recommandation : exécuter `npm audit` en CI/locale avec accès registry standard.

## Recommandations complémentaires (non bloquantes)

1. Rotation de la clé Supabase anon si elle a été exposée publiquement.
2. Ajouter une pipeline CI sécurité minimale :
   - `npm audit --audit-level=high`
   - scan secrets (ex: gitleaks/trufflehog)
3. Revue SQL/RLS complète sur toutes les tables métier (missions/frais/acomptes/bilans) pour valider les politiques `INSERT/UPDATE/DELETE` côté owner/viewer.

