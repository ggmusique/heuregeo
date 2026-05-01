# Lot B.4 — Progression (2026-05-01)

## Objectif

Fiabiliser la phase post-refactor en renforçant:

- l'observabilité des erreurs bilan,
- les contrats de la couche repository,
- la validation opérationnelle avant livraison.

## Avancées

- ✅ B.4-1 Observabilité
  - Logger structuré `logBilanError` introduit et utilisé dans `useBilan`.
  - Payload enrichi avec timestamp ISO pour faciliter la corrélation d'incidents.

- ✅ B.4-2 Contrats repository (en cours avancé)
  - Extraction d'un mapper pur `mapWeeklyAcompteMetricsFromRows`.
  - Couverture unitaire sur cas nominal, entrées invalides, et valeurs par défaut.

- 🔄 B.4-3 Smoke UI
  - Runbook prêt, exécution smoke à finaliser sur les scénarios ciblés.

## Prochaines actions immédiates

1. Exécuter le smoke UI B.4-3 (hebdo + mensuel).
2. Capturer résultats attendus/réels dans le runbook.
3. Lancer `npm run test:b4` et figer l'état de sortie B.4.
