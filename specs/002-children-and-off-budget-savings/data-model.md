# Data Model and API Contract

## Person

- `persons.role`: `adult | child`, non-null, default `adult`.
- Write payload: optional `role` on `POST /api/persons` and `PUT /api/persons/:id`.
- Read payload: `role` on every returned person.
- Existing people and old imports default to `adult`; partial updates preserve the current role.

## Savings transaction

- `savings_transactions.is_excluded_from_budget`: integer `0 | 1`, non-null, default `0`.
- Write payload: optional `isExcludedFromBudget` on transaction creation/editing.
- Read payload: `is_excluded_from_budget` on transaction rows.
- Partial updates preserve the current value. Import/export includes the column, with `0` used for old backups.

## Budget eligibility

Only adults participate in budgets. Savings products qualify when common, unowned, or owned by an adult; physical hosting does not change ownership. Monthly deposits must also be budgeted and not attributed to a child.

Balance calculations include all deposits and withdrawals, independently of budget eligibility.

## Opening balances and child account activation

- `savings.opening_balance`: non-null numeric balance, default `0`.
- `savings.opening_balance_date`: nullable date marking the start of known balance history.
- `POST /api/accounts/:id/savings-transactions` takes the existing transaction payload. It accepts child-owned accounts only, reuses a uniquely linked child-owned product, or atomically creates one with the account's entered balance and the requested movement. It returns `{ savings, transaction }`. Invalid dates, conflicting ownership, and insufficient funds are rejected without creating a product.
- Only the submitted movement is a transaction; an opening balance is not an attributed deposit. It does not affect monthly contribution totals.
- Normal savings balances and withdrawal validation include the opening balance. History includes it from the opening date, never for unknown earlier periods.
- Export/import preserves both fields; old exports default to zero and a null date.

## History endpoints

`GET /api/savings/evolution?year=YYYY&month=MM` returns twelve `{ month: YYYY-MM, total: number }` end-of-month balances including children and gifts. Year/month are validated. The same endpoint is available under `/demo/api` for isolated demo data.

`GET /api/dashboard` history is restricted to adult/common products (or the requested adult's personal products). Direct child requests for `/api/dashboard?person_id=...` and `/api/advice?person_id=...` return HTTP 400.
