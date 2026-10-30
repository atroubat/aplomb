# Changelog

Notable changes to Aplomb are recorded here in English, newest first. Entries are dated updates, not GitHub release tags. Older entries summarize changes verified in the repository history.

## Unreleased

No pending changes recorded.

## 2026-10-30

### Added

- Adult and child household profiles. Children can own accounts and savings products without participating in budget calculations, shared-charge allocation, income alerts, or advice.
- An editable **Off budget** deposit option (French UI: **Hors budget**) for gifts and exceptional funds. These deposits increase the product balance without consuming monthly income or counting towards budgeted savings contributions.
- A dedicated **Children's accounts and savings** section with balances and a separate children's subtotal.
- Deposits and withdrawals directly from child account-only cards. Confirming the first movement starts product tracking atomically and preserves the entered balance as a separate opening balance, not a fictional deposit. Later movements and corrections use the normal savings history.
- A complete Savings-page balance-history endpoint, separate from the adult-only dashboard history.
- Backward-compatible backup support for profile roles and off-budget transaction attributes.
- SpecKit documentation for child profiles and off-budget savings.

### Fixed

- Child accounts entered in Settings now appear in Savings even when no savings product is linked. Previously, Savings only displayed savings products, making these account balances invisible there.
- Linked account balances are not counted a second time alongside their savings products.
- Account-only cards clearly identify the balance entered in Settings and provide a direct link to the account settings. They do not fabricate deposits or transaction history.
- Partial edits preserve child profiles and off-budget designations.
- Savings movement corrections and deletions cannot leave a negative product balance; withdrawal validation includes preserved opening balances.
- Savings totals and transaction history refresh after movement corrections and deletions.

### Changed

- Refreshed application and development dependencies, including React 19.3.1, Vite 8.3.5, Fastify 5.12.7, Zod 4.6.7, Lucide 1.65.0, and Vitest 5.0.5.
- Kept Node.js 24 as the deployment runtime and aligned its TypeScript definitions with that major version.
- Migrated the Vitest configuration to explicit ESM.
- Expanded the automated suite to 58 tests, including budget exclusions, legacy imports, migration safety, child-account visibility, activation with opening balances, withdrawals, transaction corrections, and balance deduplication.

### Security

- Updated vulnerable direct and transitive dependencies. Root, frontend, and backend npm audits reported no known vulnerabilities when this update was verified; this is a point-in-time result, not a permanent security guarantee.

### Upgrade notes

- Back up SQLite databases before upgrading. The new columns are added automatically at startup; existing people default to adults and existing deposits remain budgeted.
- Mark a person as **Child** in Settings to exclude them from budgeting. Changing the profile applies to all periods; effective-dated profile changes are not supported.
- Child account-only cards show the balance entered in Settings, not a bank-synchronized balance. Only savings products with transaction history appear in the evolution chart.
- Accounts are not converted merely by viewing the page. Confirming their first movement creates a linked savings product while keeping the account and opening balance; no synthetic deposit is created.

## 2026-10-01

### Changed

- Updated the React Vite plugin, tsx, React Router, Zod, Lucide, and related dependencies.
- Synchronized the workspace and Docker package lockfiles and applied compatible backend security fixes.

## 2026-09-29

### Added

- Effective-dated income revisions: recurring income can change from a selected month without overwriting earlier budget calculations.
- Savings transaction editing, including corrections to an existing movement's date.

## 2026-08-26

### Changed

- Translated project specifications and design documentation into English.

## 2026-08-25

### Added

- Initial repository baseline for the self-hosted Aplomb household budget planner, including household and personal views, income, shared and personal charges, savings, advice, isolated demo data, JSON backups, and Docker deployment.
