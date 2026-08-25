# Contract: API HTTP historique

Le préfixe principal est `/api`; le mode démonstration utilise `/demo/api`.

| Domaine | Ressources |
|---|---|
| Foyer | `/persons`, `/accounts` |
| Revenus | `/incomes`, `/incomes/:id/overrides`, `/incomes/effective`, `/incomes/history` |
| Charges | `/fixed-charges`, `/personal-charges` |
| Épargne | `/savings`, `/savings/:id/transactions` |
| Calcul | `/dashboard`, `/advice` |
| Compatibilité | `/transfers`, `/actual-expenses` |
| Portabilité | `/export`, `/import`, `/data/reset` |

Les verbes HTTP, paramètres de requête et formats JSON sont ceux définis dans `packages/shared/src/schemas.ts` et les routes de `packages/backend/src/routes`. Toute rupture nécessite une nouvelle version de contrat.
