# Data Model: Budget familial

## Agrégats

- **Personne** : membre du foyer, couleur et avatar.
- **Compte** : compte courant ou support rattaché à une personne ou au foyer.
- **Revenu** : montant fixe ou variable, périodicité et propriétaire.
- **Exception de revenu** : montant effectif pour un mois donné.
- **Charge fixe** : charge commune récurrente.
- **Charge personnelle** : charge récurrente rattachée à une personne.
- **Produit d’épargne** : livret commun ou personnel avec objectif.
- **Opération d’épargne** : versement ou retrait daté.
- **Virement interne** : transfert entre comptes.
- **Dépense réelle** : entité historique conservée pour compatibilité.

## Invariants

- Tous les montants sont stockés en centimes entiers.
- Une charge personnelle possède toujours une personne.
- Une exception de revenu est unique par revenu, année et mois.
- Un retrait d’épargne possède un motif.
- Les suppressions respectent les relations SQLite existantes.
