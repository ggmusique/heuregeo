# Lot B.3 — Progression (2026-04-30)

## Objectif

Finaliser la stabilisation post-refactor de `useBilan` en verrouillant les invariants métiers critiques via tests d'intégration et helper purs.

## Actions réalisées

- Extraction des calculs acompte hebdo/non-hebdo dans `bilanEngine` et consommation par `useBilan`.
- Ajout d'invariants d'intégration sur:
  - cas hebdo nominal,
  - cas hebdo limites (sans acomptes, sur-financement, impayé élevé),
  - cas non-hebdo (équivalence formule historique),
  - cas défensifs (`periodTypes` absent, `null/undefined`, bornes à 0).

## État

- B.3-1: ✅ terminé
- B.3-2: ✅ terminé (cohérence helper non-hebdo vs formule historique)
- B.3-3: ✅ terminé (validation finale exécutée + runbook disponible)

## Critères de sortie B.3

1. Tests unitaires/integration/e2e verts.
2. Invariants hebdo et non-hebdo couverts.
3. Aucun recalcul redondant évident dans `useBilan` sur le chemin acompte.

## Validation finale

- `npm run test:b3`: OK
- `npm test`: OK
