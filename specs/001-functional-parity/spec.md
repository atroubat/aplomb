# Feature Specification: Functional-Parity Redesign

**Status:** Implemented  
**Created:** 2026-08-23

## Goal

Rebuild BudgetFoyer in the new Aplomb project on a documented, maintainable foundation without changing its functional scope.

## Required User Journeys

1. The household views the current month dashboard and charts.
2. The household changes month and filters the display by person.
3. A member creates, edits, or deletes an income, including a monthly override.
4. The household manages recurring shared charges.
5. A member manages their personal charges.
6. The household manages savings accounts and their transactions.
7. A member reviews budgeting advice.
8. The household manages members, accounts, theme, demo mode, and backups.

## Requirements

- **FR-001** BudgetFoyer routes and business labels are preserved.
- **FR-002** API payloads and responses remain compatible.
- **FR-003** Monetary calculations remain identical to the cent.
- **FR-004** The household/person filter produces the same results.
- **FR-005** Existing SQLite data can be reused without manual re-entry.
- **FR-006** The visual redesign does not replace ledgers with a new user journey.
- **FR-007** The project can be deployed with Docker and a configurable Traefik router.

## Out of Scope

- A new budgeting engine.
- Bank or accounting import.
- Removing a legacy feature.
- Adding a new user journey without a separate specification.
