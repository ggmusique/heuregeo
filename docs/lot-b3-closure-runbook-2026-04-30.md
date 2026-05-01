# Lot B.3 — Runbook de clôture (2026-04-30)

## 1) Pré-check technique

1. Vérifier que le repo est sur la branche de travail attendue.
2. S'assurer que les helpers d'état acompte restent consommés par `useBilan`:
   - `computeWeeklyAcompteState`
   - `computeStandardAcompteState`
   - `computeConsommeCettePeriode`

## 2) Validation automatique

Lancer successivement:

```bash
npm run test:unit
npm run test:integration
npm run test:e2e
```

Puis exécuter la suite globale:

```bash
npm test
```

Critère: toutes les suites vertes.

Alternative rapide:

```bash
npm run test:b3
```

## 3) Validation fonctionnelle manuelle (smoke)

1. Générer un bilan hebdomadaire avec acomptes.
2. Générer un bilan hebdomadaire sans acomptes.
3. Générer un bilan mensuel avec solde avant + acomptes.
4. Vérifier qu'aucun reste/soldes incohérents n'apparaît.

## 4) Vérifications d'invariants

- `resteAPercevoir >= 0`
- `soldeApresPeriode >= 0`
- cohérence non-hebdo entre helper standard et consommation affichée
- cohérence hebdo sur cas limites (sur-financement, impayé élevé, entrées dégradées)

## 5) Clôture du lot B.3

Le lot est considéré clos si:

- tests auto: OK
- smoke manuel: OK
- aucune erreur runtime bilan en console
- documentation `lot-b3-progress-2026-04-30.md` à jour
