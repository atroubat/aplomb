# Data Model: Household Budget

## Aggregates

- **Person**: household member, colour, and avatar.
- **Account**: current account or savings vehicle assigned to a person or the household.
- **Income**: fixed or variable amount, recurrence, and owner.
- **Income Version**: an income record bounded by an inclusive start and end month; a revision starts a new version without overwriting earlier values.
- **Income Override**: effective amount for a given month.
- **Fixed Charge**: recurring shared charge.
- **Personal Charge**: recurring charge assigned to a person.
- **Savings Account**: shared or personal savings vehicle with a goal.
- **Savings Transaction**: dated deposit or withdrawal.
- **Internal Transfer**: transfer between accounts.
- **Actual Expense**: legacy entity retained for compatibility.

## Invariants

- All monetary amounts are stored as integer cents.
- A personal charge always has a person.
- An income override is unique per income, year, and month.
- An income revision closes the previous version on the last day of the preceding month.
- A savings withdrawal has a reason.
- Deletions respect existing SQLite relationships.
