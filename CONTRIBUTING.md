# CONTRIBUTING

## Prerequis E2E

Avant tout lancement des tests E2E, la verification de migration doit passer.

Commande obligatoire:

npm run migrate:check

Ensuite seulement:

npm run test:e2e

Cette etape evite les faux positifs/faux negatifs lies a un schema Supabase incomplet.
