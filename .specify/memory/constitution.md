# Aplomb Constitution

## I. Functional Parity First

BudgetFoyer is the functional reference. A visual or technical redesign must not alter visible routes, fields, calculations, filter behaviour, or persistence rules without a separately approved specification.

## II. Separation of Responsibilities

- `frontend` renders and orchestrates interactions.
- `backend` owns use cases and SQLite access.
- `shared` owns validated shared contracts.
- Supporting tools remain isolated from the main budget application.

## III. Local, Recoverable Data

The SQLite database remains mounted outside the Docker image. Every migration is idempotent and preceded by a backup. JSON exports remain compatible with existing data.

## IV. Verifiable Changes

Every functional change requires a specification, acceptance criteria, and tests. A purely visual change must be validated against the page-parity matrix.

## V. Simplicity

The structure must remain understandable without premature abstraction. Internal reorganisations must be incremental and must never be used as a pretext for product changes.

**Version:** 1.0.0  
**Ratified:** 2026-08-23
