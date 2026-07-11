# Gustavo — Project Context

## What this is
Personal app suite (PWA) for me (Ivan) and my partner Jenny, plus friends/family on trips:
- **Expenses** (`/gustavo/trips`) — travel expense tracking + debt settling. Used by the trip group.
- **Health** (`/gustavo/health`) — exercise, diet, supplements, symptoms, weight. Just me.
- More features will be added over time — treat the repo as a suite, not a single-purpose app.

Stack: Next.js 15 (App Router) + React 19 + TypeScript, MUI v7, Zustand 5, Neon Postgres, Auth.js v5 (Google OAuth + allowlist), Vercel Blob, deployed on Vercel. Node 24, ESLint 9 flat config.

## Rules
- **pnpm only** — never yarn or npm.
- **Soft deletes** — `deleted_at`, never hard DELETE. All queries filter `WHERE deleted_at IS NULL`.
- **No Postgres ENUMs** — TEXT columns validated in app code.
- **Wrap mutating transactions** in `withAuditUser(userId, fn)` from `lib/db-audit.ts` for audit attribution.
- **utils files must never import from component files** — extract shared enums/types to a leaf file (prevents circular-import TDZ crashes; check with `pnpm check:cycles`).
- **New migration ⇒ update `.claude/docs/schema.md`** in the same change.
- **UI**: neo-brutalist design system — read the `lib/colors.ts` header before styling; shared form styles in `lib/form-styles.ts`.
- **State**: trip data lives in React state + Context (`app/providers/`); Zustand is for UI state only (filters, sort, view settings). Never `store.get()` inside computations.

## Branches & deploying
- `main` is the only active branch — push to `main` → Vercel auto-deploys.
- **Prod DB migrations are manual**: `pnpm db:migrate:prod` (uses .env.production.local). Nothing runs them automatically — coordinate with the deploy when a change needs a migration.
- `gh-pages` hosts the legacy static site — keep, don't touch.

## Local dev
- `pnpm docker:up` (Postgres 17 + Metabase) then `pnpm dev`
- Verify: `pnpm tsc --noEmit`, `pnpm lint`, `pnpm build`
- DB: localhost:5432, user `gus`, pass `yellow_shirt_dev`, db `gustavo_dev` (DBeaver); Metabase localhost:3001
- Migrations: `pnpm db:create-migration <name>`, `pnpm db:migrate`, reset with `pnpm db:reset`

## Doc map — read before working in an area
- **DB work (schema, migrations, queries)** → `.claude/docs/schema.md`
- **Repo structure, build, deployment detail** → `.claude/docs/repo-overview.md`
- **How the code is organized (App Router, patterns)** → `.claude/docs/code-guide.md`
- **Permissions model** → schema.md § Permissions + `lib/permissions.ts` / `app/utils/permissions.ts`
- **Historical design plans** (point-in-time, may be stale) → `.claude/docs/plans/`
- **Idea/todo lists** → `.claude/docs/todos/`

## Key locations
- API routes: `app/api/` (App Router route handlers); auth: `app/auth.ts` (`ALLOWED_EMAILS`)
- Debt calculation: `lib/debt.ts`; debt UI: `app/components/debt/`
- Types: `lib/types.ts` (expenses), `lib/health-types.ts` (health)
- Migrations: `database/migrations/` (numbered SQL, runner `scripts/db/migrate.js`)
