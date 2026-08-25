# Security policy

## Supported versions

Aplomb is currently maintained from the latest commit on the `main` branch.
Older commits and unmaintained forks are not supported.

## Reporting a vulnerability

Please do not open a public issue for a suspected vulnerability.

Use GitHub's **Report a vulnerability** feature in the repository's Security
tab to send a private report. Include the affected component and commit, clear
reproduction steps, potential impact, and a proposed mitigation if known.

Do not include real financial records, database files, access tokens, bank
credentials, personal data, or secrets. Use minimal synthetic examples.

Reports will be acknowledged when the maintainer is available. This is a
volunteer-maintained project and no response or remediation deadline is
guaranteed.

## Deployment warning

Aplomb has no built-in user authentication. A default instance must not be
exposed directly to the public internet. Put it behind HTTPS and a trusted
authentication proxy, restrict network access, keep dependencies updated, and
maintain tested backups.

Bank connector credentials must only be supplied through ignored environment
files or a secrets manager. Never place them in source code, Compose files,
issues, screenshots, logs, or support requests.
