# Implementation Plan: Functional Parity

## Strategy

The migration is conservative: existing functional code is used as the reference and documented before any further extraction.

## Components

- `packages/frontend`: legacy React pages and components.
- `packages/backend`: Fastify routes, calculations, and persistence.
- `packages/shared`: shared Zod schemas.
- `data/budget.db`: persistent personal database.
- `specs`: decisions, contracts, and parity matrix.

## Sequence

1. Freeze the reference routes and behaviours.
2. Copy the functional foundation into the new directory.
3. Rename only the visible product identity to Aplomb.
4. Keep the package-based architecture to limit risk.
5. Add SpecKit documentation and characterisation tests.
6. Build, test, and compare every page before deployment.

## Future Evolution

Extractions into smaller domain packages will happen one at a time, with characterisation tests before and after. No logic move will be combined with a functional change.
