# Contributing to Aplomb

Thank you for considering a contribution.

## Before you start

- Use GitHub issues for reproducible bugs and focused feature proposals.
- Never attach real financial data, SQLite databases, JSON exports, credentials,
  private logs, or personal information.
- Use GitHub's private vulnerability reporting for security issues; see
  [SECURITY.md](SECURITY.md).
- Keep the planning-first product scope. Aplomb is not intended to become a
  general-purpose accounting platform.

## Development workflow

1. Fork the repository and create a branch from `main`.
2. Install dependencies with `npm install`.
3. Make a focused change that preserves existing functional behavior unless the
   issue explicitly changes the specification.
4. Add or update tests when behavior changes.
5. Run the checks below.
6. Open a pull request with a concise explanation and screenshots for visual
   changes.

```bash
npm run build --workspace=budgetfoyer-frontend
npm run build --workspace=budgetfoyer-backend
npm test --workspace=budgetfoyer-backend
```

## Code conventions

- Use TypeScript for application code.
- Keep API validation in shared Zod schemas where practical.
- Store money as explicit numeric values and centralize rounding behavior.
- Keep household and personal ownership semantics explicit.
- Preserve responsive behavior across phone, tablet, and desktop layouts.
- Do not add telemetry or external data transmission without explicit,
  documented opt-in behavior.

## Pull requests

By submitting a contribution, you agree that it may be distributed under the
project's MIT License. Keep pull requests small enough to review and describe
any migration or privacy impact.
