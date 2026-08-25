# Aplomb

![Aplomb icon](packages/frontend/public/icons/icon-192-v5.png)

Aplomb is a self-hosted household budget planner designed to answer a simple question: **how should our monthly income be allocated?**

It focuses on planning rather than bank-account tracking. Aplomb supports household and personal views, fixed or temporary income, shared and personal expenses, savings accounts, monthly savings contributions, and budget guidance based on common allocation methods.

> [!IMPORTANT]
> Aplomb is a personal planning tool, not accounting, banking, tax, investment, or financial advice. See [DISCLAIMER.md](DISCLAIMER.md).

## Highlights

- Monthly household budget planning
- Household and per-person views
- Fixed, variable, and temporary monthly income
- Shared and personal recurring expenses
- Savings accounts, balances, deposits, withdrawals, and monthly goals
- 50/30/20 and 75/15/10 planning guidance
- Demo mode with isolated sample data
- JSON backup and restore
- Responsive light and dark themes
- Self-hosted Docker deployment
- No telemetry or analytics by default

## Screens and domain model

The main application is organized around five areas:

1. **Budget** — monthly overview, household allocation, cash flow, and savings history.
2. **Income** — recurring income and month-specific overrides.
3. **Expenses** — shared and personal expenses with recurrence and effective dates.
4. **Savings** — savings products, ownership, balances, deposits, and withdrawals.
5. **Advice** — planning guidance based on the selected household member and budget method.

The functional specification, data model, API contract, and implementation plan are available in [`specs/001-functional-parity`](specs/001-functional-parity).

## Technology

- **Frontend:** React, TypeScript, Vite, React Router, Recharts
- **Backend:** Fastify, TypeScript, SQLite, Zod
- **Runtime:** Node.js 24
- **Deployment:** Docker and Docker Compose
- **Architecture:** npm workspaces with shared validation schemas

```text
aplomb/
├── packages/
│   ├── frontend/          # Main React application
│   ├── backend/           # Fastify API, SQLite migrations, and tests
│   └── shared/            # Shared Zod schemas
├── specs/                 # SpecKit functional and technical documentation
├── Dockerfile
└── docker-compose.yml
```

## Quick start with Docker

### Requirements

- Docker Engine 24 or newer
- Docker Compose v2

The included Compose file is configured for a Traefik-based homelab. If you do not use Traefik, run the container directly:

```bash
docker build -t aplomb .
docker run --name aplomb \
  -p 3000:3000 \
  -v aplomb-data:/app/data \
  -e DATABASE_PATH=/app/data/budget.db \
  -e DEMO_DATABASE_PATH=/app/data/demo.db \
  aplomb
```

Open <http://localhost:3000>.

The SQLite database is stored in the `aplomb-data` Docker volume. Back it up before upgrading or changing migrations.

## Local development

### Requirements

- Node.js 24 or newer
- npm 10 or newer

Install all workspace dependencies:

```bash
npm install
```

Start the API and frontend in separate terminals:

```bash
npm run dev --workspace=budgetfoyer-backend
npm run dev --workspace=budgetfoyer-frontend
```

- Frontend: <http://127.0.0.1:5173>
- API: <http://127.0.0.1:3000>

Copy `.env.example` only when you need to override the default local paths. Never commit `.env` files or database files.

## Build and test

```bash
npm run build --workspace=budgetfoyer-frontend
npm run build --workspace=budgetfoyer-backend
npm test --workspace=budgetfoyer-backend
```

## Data and privacy

Aplomb stores the information entered into the application in a local SQLite database. The main application does not include telemetry, advertising, or analytics. Anyone operating a public deployment is responsible for access control, transport encryption, backups, retention, and compliance with applicable law.

The application currently has **no built-in user authentication**. Do not expose it directly to the public internet without a trusted authentication proxy and HTTPS. Read [PRIVACY.md](PRIVACY.md) and [SECURITY.md](SECURITY.md) before deploying.

## Contributing

Issues and pull requests are welcome. Please read:

- [CONTRIBUTING.md](CONTRIBUTING.md)
- [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md)
- [SECURITY.md](SECURITY.md) for private vulnerability reports

## Project status

Aplomb is a personal, self-hosted project. Interfaces and database migrations may evolve between releases. Back up your data before upgrading.

## License

Copyright © 2026 Alexandre Troubat.

Released under the [MIT License](LICENSE). The Aplomb name and visual identity are not granted as trademarks by the software license; see [NOTICE](NOTICE).
