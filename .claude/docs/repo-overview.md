# Repo Overview: Directory Structure, Build, and Deployment

## What this app is

Gustavo is a personal app suite used by Ivan + Jenny (and friends/family on
trips). It has two feature areas today:

- **Expenses** — trips, expense splitting, currency conversion to USD, debt
  settling. Used by the whole trip group.
- **Health** — exercise, diet, supplements, symptoms, and weight tracking.
  Single-user (Ivan).

It runs as a PWA (Progressive Web App) — installed on phones via "Add to
Home Screen" and looks/feels like a native app without needing an App Store.

---

## Branch Strategy

- **`main` is the only active branch.** Push to `main` → Vercel auto-deploys.
- `gh-pages` hosts the legacy static (pre-full-stack) site — keep, don't touch.
- Feature work: branch off `main`, merge back. Every PR gets a Vercel preview
  deployment.

---

## Top-Level Directory Structure

```
gustavo/
├── app/                  Next.js App Router — pages, layouts, API routes, components
├── database/             SQL migrations (numbered), seeds, README
├── infra/                Docker Compose + Dockerfile for local dev
├── lib/                  Shared server/client utilities: DB pool, types, permissions, styles
├── public/               Static assets: icons, manifest, images
├── scripts/              Node/shell scripts: db/ (migrate, seed, reset), backfill/, setup/
├── .claude/              Claude context: CLAUDE.md, docs/, skills/, settings.json
├── next.config.mjs       Next.js configuration + PWA setup
├── middleware.ts         Auth guard — runs before every request
└── package.json          pnpm scripts and dependencies
```

---

## app/ — The Application

```
app/
├── layout.tsx                Root HTML shell — MUI provider, auth session, PWA meta
├── page.tsx                  Root redirect (/ → /gustavo)
├── auth.ts                   Auth.js config: Google provider + ALLOWED_EMAILS allowlist
│
├── api/                      API route handlers
│   ├── auth/[...nextauth]/   Auth.js endpoints
│   ├── trips/                Trips CRUD + nested expenses/, locations/, participants/
│   ├── expense-categories/   Categories CRUD
│   ├── places/               Google Places autocomplete + details
│   ├── health/               Health feature APIs: workouts, exercises, supplements,
│   │                         presets, foods, food-logs, symptoms, symptom-logs,
│   │                         weight-logs, muscle-groups
│   ├── users/                Users list + me/preferences
│   ├── allowed-emails/       Allowlist management
│   └── images/[...path]/     Proxy for receipt images via Vercel Blob
│
├── login/                    Login page with Google Sign-In
├── auth/error/               Auth error page
├── offline/                  PWA offline fallback
├── health/                   Status page (DB ping) — NOT the health tracker
│
├── gustavo/                  The main app (auth-protected)
│   ├── layout.tsx            Persistent header + navigation for all /gustavo pages
│   ├── page.tsx              Home dashboard (feature rows: trips, health, settings)
│   ├── trips/
│   │   ├── page.tsx          Trip list
│   │   └── [slug]/           Trip detail, split into sub-pages:
│   │       ├── page.tsx        overview
│   │       ├── expenses/       expense list
│   │       ├── debts/          debt calculator / settle-up
│   │       ├── graphs/         spending charts
│   │       ├── activity/       audit/activity feed
│   │       └── links/          external links
│   ├── health/               Health suite: diet, exercise (log), exercises (library),
│   │                         supplements, symptoms, weight
│   └── settings/             Settings hub: categories, locations, invite
│
├── components/               Reusable components: expense/trip form dialogs, form-drawer,
│                             nav-drawer, place-autocomplete, pull-to-refresh, sliding-toggle,
│                             PWA install/update prompts, plus folders:
│                             auth/ debt/ graphs/ health/ insights/ links/ menu/ receipts/
│
├── providers/                React Context providers
│   ├── trip-data-provider.tsx   Current trip + raw expenses (React state)
│   ├── spend-data-provider.tsx  Derived filtered/sorted data
│   ├── refresh-provider.tsx     onRefresh callback without prop drilling
│   ├── query-provider.tsx       React Query client
│   └── fab-provider.tsx         Floating action button state
│
├── hooks/                    useCurrentUser, useDashboardData, usePWAInstall, useWindowSize
└── utils/                    api.ts (typed fetch wrappers), permissions.ts (frontend),
                              icons.tsx, currency.ts, cache.ts, colors.ts, links.ts, etc.
```

Rule of thumb: `app/utils/` files must never import from component files —
shared enums/types go in leaf files (see `app/components/menu/enums.ts`).

---

## lib/ — Shared Utilities

```
lib/
├── db.ts                    Single shared pg.Pool — imported by all API routes
├── db-audit.ts              withAuditUser() — wraps DB writes with SET LOCAL audit.changed_by
├── api-helpers.ts           Shared route-handler helpers
├── permissions.ts           Server-side permission checks (incl. DB lookups)
├── types.ts                 Expense-domain types (TripSummary, Expense, ...)
├── health-types.ts          Health-domain types (Workout, Exercise, ...)
├── health/                  Health constants (muscle groups, display order)
├── health-section-order.ts  Health landing page section order
├── debt.ts                  Debt calculation logic
├── colors.ts                Neo-brutalist design system (READ THE HEADER before UI work)
├── form-styles.ts           Shared form sx styles (fieldSx, labelSx, errorFieldSx, ...)
├── mui-theme.ts             MUI theme
├── countries.ts             Country/currency reference data
├── query-keys.ts            React Query cache keys
└── quotes.ts                Fun quotes for the dashboard
```

---

## database/ — Schema and Migrations

- `migrations/` — numbered SQL files `00001`–`00037` (see `.claude/docs/schema.md`
  for the current schema). Never edit applied migrations; always add new ones.
- `seeds/` — initial data, run manually via `pnpm db:seed`.
- Runner: `scripts/db/migrate.js`, tracks applied versions in `schema_migrations`.

---

## infra/ — Local Docker Stack

```
infra/
├── docker-compose.yml    Postgres 17.5 (port 5432) + Metabase (port 3001), project name "gustavo"
└── Dockerfile            node:24-alpine, pnpm-only, multi-stage build
```

The Docker stack is for **local development only**. Production uses Neon
(cloud Postgres) and Vercel (hosting).

---

## scripts/

```
scripts/
├── db/         migrate.js, create-migration.sh, reset-database.sh (destructive!),
│               seed.js, test-db-connection.js, test-as.js
├── backfill/   One-time Google Sheets CSV import scripts + trip data
├── setup/      create-env-local.sh
└── app/        start.js
```

---

## How the Build Works

### Local
```bash
pnpm docker:up    # Starts postgres + metabase in Docker
pnpm dev          # Starts Next.js dev server at localhost:3000
```

### Production (Vercel)
Push to `main` → Vercel automatically:
1. Detects pnpm (via `pnpm-lock.yaml` + `packageManager` in package.json)
2. Runs `pnpm install` then `pnpm build`
3. Deploys to its edge network (~1-2 min)

**No manual deploy step** — every push to `main` is a deploy. Every PR gets a
preview deployment.

**DB migrations are NOT automatic.** Run `pnpm db:migrate:prod` (uses
`.env.production.local`) manually, coordinated with the deploy.

---

## How Vercel + Neon Work Together

Neon is serverless Postgres — standard Postgres that scales to zero, free tier
never pauses. Connection via `DATABASE_URL`:
```
postgresql://user:password@host.neon.tech/dbname?sslmode=require
```

`lib/db.ts` creates a `pg.Pool` from this URL (SSL in prod, plain locally).

Vercel env vars (dashboard → Project Settings → Environment Variables):
- `DATABASE_URL` — injected by the Neon integration
- `AUTH_SECRET`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET` — Auth.js
- Locally these live in `.env.local` (gitignored); prod-pointing scripts use
  `.env.production.local`.

---

## Authentication Flow

1. Unauthenticated user visits any page
2. `middleware.ts` (Auth.js middleware) sees no valid session → redirect to `/login`
3. "Sign in with Google" → OAuth → `/api/auth/callback/google`
4. Auth.js checks the email against `ALLOWED_EMAILS` in `app/auth.ts`
5. Allowed → session JWT cookie, redirect to `/gustavo`; denied → `/auth/error`

Sessions are signed JWT cookies — no session table. To add a user: edit
`ALLOWED_EMAILS` in `app/auth.ts` and push (Vercel deploys in ~1 min).

---

## pnpm Scripts Summary

| Script | What it does |
|--------|-------------|
| `pnpm dev` | Start Next.js dev server |
| `pnpm build` | Production build |
| `pnpm lint` | ESLint check |
| `pnpm check:cycles` | Detect circular imports (madge) |
| `pnpm docker:up` / `docker:down` / `docker:logs` | Local Docker stack |
| `pnpm db:migrate` | Run pending migrations (local) |
| `pnpm db:migrate:prod` | Run pending migrations against Neon (manual, deliberate) |
| `pnpm db:create-migration <name>` | Create new migration file |
| `pnpm db:reset` | Reset local DB (destructive) |
| `pnpm db:seed` | Seed local data |

---

## Tech Stack Summary

| Layer | Tech |
|-------|------|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript 5.8 |
| UI | MUI v7 |
| Icons | Tabler Icons + Phosphor Icons |
| Charts | visx (D3-based) |
| State (UI) | Zustand 5 |
| State (server data) | React Context + React Query |
| Database | Postgres (Neon in prod, Docker locally) |
| DB client | node-postgres (pg) |
| Auth | Auth.js v5 (Google OAuth + allowlist) |
| Hosting | Vercel (auto-deploy from `main`) |
| File storage | Vercel Blob (receipt images) |
| PWA | next-pwa (Workbox service worker) |
| Package manager | pnpm 10 |
| Node | 24 |
