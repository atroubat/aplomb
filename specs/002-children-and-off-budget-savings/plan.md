# Implementation Plan

## Architecture

- Add additive SQLite columns with backward-compatible defaults.
- Expose role and budget-exclusion fields through existing CRUD routes and shared schemas.
- Centralize adult IDs, eligible savings products, transaction eligibility and balance-history calculation in `packages/backend/src/utils/budget-scope.ts`.
- Apply scope rules in dashboard, advice, effective-income/history, and monthly savings helpers; do not filter actual product balances.
- Provide a dedicated complete Savings-page history endpoint rather than reusing budget-scoped dashboard history.
- Reuse existing selects, checkbox styles and modal structure. Keep all current themes and navigation.
- Partition Savings-page products into common/adult/child collections. Show unlinked child accounts alongside child products, using entered account balances without changing stored data or budget calculations. Deduplicate by `account_id`; provide a Settings account-editor deep link.

## Verification

Run backend regression tests, both production builds and Docker build. Exercise child creation, account/product ownership, off-budget creation/editing and adult-only selectors on an isolated browser test instance. Check narrow portrait, landscape and desktop layouts, light and dark themes. Back up live SQLite databases before deployment.
