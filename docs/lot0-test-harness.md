# Lot 0 — Socle de tests (branche refactoring-2026-04-26)

## Objectif
Mettre en place un filet de sécurité exécutable **avant** les refactorings structurels.

## Typologie des tests mise en place

- **Unitaires** (`src/tests/unit`)
  - règles pures du moteur bilan (`computeStatutPaye`, `computeImpayePrecedent`, `normalizeBilanForWrite`).

- **Intégration** (`src/tests/integration`)
  - enchaînement des calculs acompte/missions/frais sur une période (`calculerSoldeAcomptesAvant` + `calculerAcomptesBilan`).

- **E2E métier minimal** (`src/tests/e2e`)
  - chaîne critique simplifiée : durée mission -> semaine -> normalisation bilan.

## Commandes

```bash
npm run test:unit
npm run test:integration
npm run test:e2e
npm test
```

## Remarques

- Le socle repose sur `node:test` pour éviter toute dépendance externe bloquante.
- Ce lot couvre les règles métier critiques ; les tests UI navigateur pourront être ajoutés au lot suivant si nécessaire.
