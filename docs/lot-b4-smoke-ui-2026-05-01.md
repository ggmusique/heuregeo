# Lot B.4 — Smoke UI (2026-05-01)

## But

Valider rapidement en interface les scénarios critiques de génération de bilan
après extraction des helpers/repository.

## Pré-requis

- base de données de dev accessible
- données missions/frais/acomptes présentes pour au moins un patron
- application lancée localement

## Scénarios hebdomadaires

### H1 — Semaine avec acomptes

- Entrées: missions + frais + acomptes existants sur la semaine.
- Vérifier:
  - `acompteConsomme` > 0
  - `resteAPercevoir >= 0`
  - absence d'erreur en console

### H2 — Semaine sans acomptes

- Entrées: missions/frais mais aucun acompte alloué sur la semaine.
- Vérifier:
  - `acompteConsomme = 0`
  - `resteAPercevoir` reflète bien la dette de période
  - absence d'erreur en console

## Scénarios mensuels

### M1 — Solde avant + acomptes dans période

- Entrées: solde avant positif + acomptes versés sur le mois.
- Vérifier:
  - `soldeApresPeriode >= 0`
  - `consommeCettePeriode` cohérent avec le calcul standard
  - absence d'erreur en console

### M2 — Mois sans donnée

- Entrées: aucune mission/frais/acompte sur la période.
- Vérifier:
  - alerte utilisateur lisible
  - pas d'état incohérent enregistré
  - absence d'erreur runtime

## Résultats (à compléter)

- H1: ☐
- H2: ☐
- M1: ☐
- M2: ☐

## Critère de validation

Smoke UI validé quand les 4 scénarios sont cochés et sans erreur console bloquante.
