# Lot B.4 — Note de clôture (2026-05-01)

## Périmètre clôturé

- B.4-1 Observabilité.
- B.4-2 Contrats repository.
- B.4-3 Smoke UI.

## Validation réalisée

- Exécution de la gate B.4 complète via `npm run test:b4`.
- Résultat: vert sur les suites unitaires, d'intégration et e2e.
- Smoke UI: scénarios H1, H2, M1, M2 validés.

## Décision

Le lot B.4 est clôturé au **2026-05-01**.

## Points de vigilance résiduels

- Conserver le suivi des warnings npm liés à `http-proxy` pour éviter un blocage lors d'une future montée de version npm.
- Maintenir la discipline de validation smoke UI à chaque refactor touchant `useBilan` et la couche repository.
