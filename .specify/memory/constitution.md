# Constitution Aplomb

## I. Parité fonctionnelle avant tout

BudgetFoyer est la référence fonctionnelle. Une refonte graphique ou technique ne doit modifier ni les routes visibles, ni les champs, ni les calculs, ni le comportement des filtres, ni les règles de persistance sans spécification approuvée séparément.

## II. Séparation des responsabilités

- `frontend` affiche et orchestre les interactions.
- `backend` porte les cas d’usage et l’accès SQLite.
- `shared` porte les contrats validés partagés.
- Les outils annexes restent isolés du budget principal.

## III. Données locales et récupérables

La base SQLite reste montée hors de l’image Docker. Toute migration est idempotente et précédée d’une sauvegarde. L’export JSON demeure compatible avec les données existantes.

## IV. Changements vérifiables

Toute modification fonctionnelle exige une spécification, des critères d’acceptation et des tests. Une modification purement graphique doit être validée contre la matrice de parité des pages.

## V. Simplicité

La structure doit rester compréhensible sans abstraction prématurée. Les réorganisations internes doivent être progressives et ne jamais servir de prétexte à une modification produit.

**Version :** 1.0.0  
**Ratifiée :** 2026-08-23
