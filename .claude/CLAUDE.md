# Gustavo — Project Context

## What this is
Personal app suite (PWA) for me (Ivan) and my partner Jenny, plus friends/family on trips:
- **Expenses** (`/gustavo/trips`) — travel expense tracking + debt settling. Used by the trip group.
- **Health** (`/gustavo/health`) — exercise, diet, supplements, symptoms, weight. Just me.
- More features will be added over time — treat the repo as a suite, not a single-purpose app.

Stack: Next.js 15 (App Router) + React 19 + TypeScript, MUI v7, Zustand 5, Neon Postgres, Auth.js v5 (Google OAuth + allowlist), Vercel Blob, deployed on Vercel. Node 24, ESLint 9 flat config.

## Project policies (from Ivan, July 2026)
- **Security**: Google SSO + allowlist is the right level. Follow general best
  practices for a project of this scope — no unauthenticated API/DB access ever —
  but don't add heavy security infrastructure. The data is personal, not financial.
- **Costs**: $0/month is the goal (not strict). ALWAYS check with Ivan before
  anything that could accrue a cost (paid APIs, tier upgrades). Google Places API
  usage must stay within free credit.
- **Backups**: Neon's built-in restore (~1 day window) is the current story.
  Wanted: on-demand or automated pg_dump stored somewhere safe (PC or Google
  Drive) — not yet built.
- **UX priorities, in order**: (1) fast/snappy/native-feeling — the app should
  never feel like a mobile website; (2) minimal friction for data entry (fewer
  taps, less typing, but stay intuitive); (3) consistent neo-brutalist theme.
- **Testing**: thin unit-test layer on real logic only (debt calculation,
  permissions, split detection, OCC) — Vitest set up July 2026 (`pnpm test`);
  don't test forms/pages.
- **Observability**: no monitoring needed (app is light, deploys are verified).
  Wanted eventually: in-app bug reporting so users can flag issues with context.

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
- Production: **https://gusfring.vercel.app** (Vercel project `gustavo`)
- `main` is the only active branch — push to `main` → Vercel auto-deploys.
- **Prod DB migrations are manual**: `pnpm db:migrate:prod` (uses .env.production.local). Nothing runs them automatically — coordinate with the deploy when a change needs a migration.
- `gh-pages` hosts the legacy static site — keep, don't touch.

## Local dev
- `pnpm docker:up` (Postgres 17 + Metabase) then `pnpm dev`
- Verify: `pnpm tsc --noEmit`, `pnpm lint`, `pnpm build`
- Tests: `pnpm test` (Vitest, `tests/`) — DB-backed tests hit local docker Postgres, so `pnpm docker:up` first. Run at checkpoints when touching tested logic (OCC, and future real-logic suites).
- DB: localhost:5432, user `gus`, pass `yellow_shirt_dev`, db `gustavo_dev` (DBeaver); Metabase localhost:3001
- **Component gallery**: `localhost:3000/dev/gallery` — renders components/forms in
  isolation with mock data (`app/dev/gallery/fixtures.ts`). Dev-only: 404s in prod
  (layout gate) and skips auth (middleware exclusion). Use it to view/verify UI
  without clicking through app flows; add specimens when building new presentational
  components. Dev-only "Gallery" entry at the bottom of the nav drawer.
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
