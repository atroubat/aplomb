# Contract: Legacy HTTP API

The primary prefix is `/api`; demo mode uses `/demo/api`.

| Domain | Resources |
|---|---|
| Household | `/persons`, `/accounts` |
| Income | `/incomes`, `/incomes/:id/overrides`, `/incomes/effective`, `/incomes/history` |
| Charges | `/fixed-charges`, `/personal-charges` |
| Savings | `/savings`, `/savings/:id/transactions` |
| Calculations | `/dashboard`, `/advice` |
| Compatibility | `/transfers`, `/actual-expenses` |
| Portability | `/export`, `/import`, `/data/reset` |

HTTP verbs, query parameters, and JSON formats are defined by `packages/shared/src/schemas.ts` and the routes in `packages/backend/src/routes`. Any breaking change requires a new contract version.

`POST /incomes/:id/revisions` creates a new version of an income from an `effectiveFrom` month (`YYYY-MM`) and closes the preceding version automatically. `PUT /savings/transactions/:id` supports correcting an existing savings transaction, including its date.
