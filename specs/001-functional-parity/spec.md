# Feature Specification: Refonte à parité fonctionnelle

**Statut :** Implémentée  
**Créée :** 2026-08-23

## Objectif

Reprendre BudgetFoyer dans le nouveau projet Aplomb avec une base documentée et maintenable, sans modifier son périmètre fonctionnel.

## Parcours obligatoires

1. Le foyer consulte le tableau de bord du mois et ses graphiques.
2. Le foyer change de mois et filtre l’affichage par personne.
3. Un membre crée, modifie ou supprime un revenu, y compris une exception mensuelle.
4. Le foyer gère les charges fixes communes.
5. Un membre gère ses charges personnelles.
6. Le foyer gère ses produits d’épargne et leurs opérations.
7. Un membre consulte les conseils budgétaires.
8. Le foyer gère membres, comptes, thème, démonstration et sauvegarde.

## Exigences

- **FR-001** Les routes et intitulés métier de BudgetFoyer sont conservés.
- **FR-002** Les payloads et réponses de l’API restent compatibles.
- **FR-003** Les calculs monétaires restent identiques au centime.
- **FR-004** Le filtre Foyer / personne produit les mêmes résultats.
- **FR-005** Les données SQLite existantes sont réutilisables sans saisie manuelle.
- **FR-006** La refonte graphique ne remplace pas les registres par un nouveau parcours.
- **FR-007** Le projet est déployable avec Docker et un routeur Traefik configurable.

## Hors périmètre

- Nouveau moteur budgétaire.
- Import bancaire ou comptable.
- Suppression d’une fonctionnalité historique.
- Ajout d’un nouveau parcours sans spécification distincte.
