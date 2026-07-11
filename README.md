# Gustavo — Personal App Suite

A multi-feature personal PWA: travel expense tracking for the trip group, plus
personal health tracking.

## Features

### Expenses (`/gustavo/trips`)

Travel expense tracking and cost splitting — trips, multi-currency expenses
converted to USD, debt settling.

### Health (`/gustavo/health`)

Personal health tracking — exercise, diet, supplements, symptoms, weight.

## Stack

Next.js 15 (App Router) + TypeScript PWA, MUI v7, Neon Postgres, Auth.js
(Google OAuth + email allowlist), hosted on Vercel.

Deeper docs live in `.claude/docs/`:

-   [repo-overview.md](.claude/docs/repo-overview.md) — structure, build, deployment
-   [schema.md](.claude/docs/schema.md) — database schema
-   [code-guide.md](.claude/docs/code-guide.md) — how the code is organized

## Quick Start

Requires Node 24 (`.nvmrc`), pnpm, and Docker.

```bash
pnpm install
pnpm docker:up      # Postgres 17 + Metabase (local only)
pnpm db:migrate     # apply migrations
pnpm dev            # http://localhost:3000
```

Local DB: `localhost:5432`, user `gus`, pass `yellow_shirt_dev`, db
`gustavo_dev` (use DBeaver). Metabase: `localhost:3001`.

## Common Scripts

| Script | What it does |
| --- | --- |
| `pnpm dev` | Start dev server |
| `pnpm build` / `pnpm lint` / `pnpm tsc --noEmit` | Verify |
| `pnpm check:cycles` | Detect circular imports |
| `pnpm db:migrate` / `pnpm db:migrate:prod` | Migrations (prod is manual + deliberate) |
| `pnpm db:create-migration <name>` | New migration file |
| `pnpm db:reset` | Reset local DB (destructive) |

## Deployment

Push to `main` → Vercel auto-deploys (~1-2 min). PRs get preview deployments.
Prod DB migrations are **manual**: `pnpm db:migrate:prod`.

The `gh-pages` branch hosts the legacy static version of the app — untouched.

## Troubleshooting

### WSL issues on Windows (bash-based scripts fail)

If `pnpm db:reset` / `db:create-migration` fail with
`execvpe(/bin/bash) failed`, your WSL default distribution is probably
`docker-desktop` (which has no bash):

```bash
wsl --list --verbose
wsl --set-default Ubuntu
```

### Port 5432 conflict

A locally installed Windows Postgres service can conflict with Docker.
Disable its auto-start:

```powershell
Get-Service -Name "postgresql*" | Set-Service -StartupType Disabled
```
