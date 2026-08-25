# Privacy

Last updated: August 25, 2026

## Default self-hosted application

Aplomb is self-hosted software. By default, the main application stores the
information entered by its users in a SQLite database controlled by the person
or organization operating the deployment.

The project does not include analytics, advertising, telemetry, or a developer-
operated cloud service. The project author does not receive data from a
self-hosted Aplomb instance merely because the software is being used.

Budget data may include income, expenses, savings balances, household-member
names, account labels, and other information entered by the user. JSON exports
and database backups contain sensitive financial information and must be
protected accordingly.

## Operator responsibilities

The person or organization hosting Aplomb determines why and how data is
processed and is responsible for:

- limiting access to authorized users;
- enabling HTTPS and appropriate authentication before network exposure;
- securing the host, database, exports, logs, and backups;
- defining retention and deletion procedures;
- informing users about the deployment and any optional integrations; and
- complying with applicable privacy and data-protection law.

## Data access and deletion

Users of a self-hosted instance should contact its operator for access,
correction, export, or deletion requests. The application includes JSON export
and reset controls, but operators should verify backups and other retained
copies separately.

## Repository and community interactions

Information posted publicly in GitHub issues, discussions, or pull requests is
handled by GitHub. Never include real financial data, database files, exports,
credentials, private logs, or personal information in a public report.
