# Implementation Plan: Parité fonctionnelle

## Stratégie

La migration est conservatrice : le code fonctionnel existant est repris comme référence, puis documenté avant toute extraction supplémentaire.

## Composants

- `packages/frontend` : pages et composants React historiques.
- `packages/backend` : routes Fastify, calculs et persistance.
- `packages/shared` : schémas Zod communs.
- `data/budget.db` : base personnelle persistante.
- `specs` : décisions, contrats et matrice de parité.

## Séquence

1. Geler les routes et comportements de référence.
2. Copier la base fonctionnelle dans le nouveau répertoire.
3. Renommer uniquement l’identité visible en Aplomb.
4. Conserver l’architecture par packages pour limiter le risque.
5. Ajouter la documentation SpecKit et les tests de caractérisation.
6. Construire, tester et comparer chaque page avant déploiement.

## Évolutions futures

Les extractions vers des packages métier plus fins se feront une par une, avec tests de caractérisation avant et après. Aucun déplacement de logique ne sera combiné avec une modification fonctionnelle.
