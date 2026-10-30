# Feature Specification: Children and Off-Budget Savings

**Created:** 2026-10-30

## User journeys

1. Add or edit a household member as an adult or child in Settings.
2. Assign an account or savings product to a child and manage its balance normally.
3. Mark a savings deposit as off-budget when it represents a gift or exceptional funds.
4. Change that designation later through transaction editing without re-entering the deposit.

## Functional requirements

- **FR-001** Children must never enter income totals, shared-charge allocation, budget calculations, variable-income alerts, or advice, including data restored from backups.
- **FR-002** Children remain visible in household settings and available as account/savings owners. Budget, income, personal-charge and advice selectors show adults only.
- **FR-003** Child-owned savings and goals are excluded from dashboard KPIs, savings goals, and dashboard balance history, regardless of who entered or funded a deposit.
- **FR-004** The Savings page retains all products, balances and balance history, including children and gifts. Child-owned products are labelled as outside the budget.
- **FR-005** Off-budget deposits are excluded from monthly household/personal savings contributions, remaining-income calculations, and advice. Common attributed and unattributed deposits follow the same rule.
- **FR-006** All deposits, including gifts, continue to count in actual balances and balance history and can be withdrawn subject to the full available balance.
- **FR-007** Both new attributes survive export/import. Older backups restore adults and budgeted transactions by default.
- **FR-008** Editing an unrelated field never resets a child role or off-budget designation.
- **FR-009** The Savings page also lists child-owned accounts created in Settings without an associated savings product. Their entered balance is visible in the children's subtotal and overall displayed total, never in budget/advice calculations.
- **FR-010** A linked account is not added again to savings totals. Account-only balances are labelled as entered balances without transaction history; no deposit history is fabricated.
- **FR-011** Child account-only cards offer deposits and withdrawals. Confirming the first movement atomically creates a child-owned linked product, copies the entered balance into a separate opening balance dated to the movement, and records only the actual movement. Cancelling or a rejected withdrawal creates nothing.
- **FR-012** Later movements reuse that product without recopying the opening balance. Full balances, withdrawals, corrections, balance history and backup/restore include the opening balance without treating it as a monthly contribution. Earlier date corrections extend the known opening date as needed; earlier history is never backfilled automatically.

## Scope boundaries

- No accounting, bank integration, child-specific budget or new allocation method.
- Exclusion is a per-transaction option, not a new product type.
- Child-owned savings are excluded from budgeting automatically; no per-deposit checkbox is required for that exclusion.
- Changing an existing person's role updates their budget eligibility for all periods; effective-dated role changes are out of scope.

## Acceptance checks

- A child account and deposit leave adult advice and monthly budget unchanged.
- An ordinary deposit consumes monthly budget; a gift of the same amount does not.
- Toggling off-budget status changes monthly totals, not the account balance.
- A date-only edit preserves off-budget status.
- The Savings page history includes child balances; dashboard history does not.
- Database migration is additive, idempotent and preserves existing amounts.
