# Repo Overview: Directory Structure, Build, and Deployment

## What this app is

Gustavo is a personal travel expense tracker. A small group of friends
takes trips together, pays for things, and later needs to figure out who
owes who. The app stores expenses per-trip, converts foreign currencies to
USD, and runs a debt calculator to settle up.

It runs as a PWA (Progressive Web App) — installed on phones via "Add to
Home Screen" and looks/feels like a native app without needing an App Store.

---

## Branch Strategy

```
main             → GitHub Pages (old static version — do NOT touch)
  fullstack      → This full-stack Next.js app — Vercel watches this branch
  japan-2025     → Trip-specific data work, branches off main
```

**Active development is on `fullstack`.** Push here to deploy.

---

## Top-Level Directory Structure

```
gustavo/
├── app/                  Next.js App Router — pages, layouts, API routes, components
├── database/             SQL migrations + seed data
├── infra/                Docker Compose + Dockerfile for local dev
├── lib/                  Shared TypeScript utilities: DB pool, audit helper, types
├── public/               Static assets: icons, manifest, images
├── scripts/              Node.js scripts for DB management
├── .claude/              AI assistant context (CLAUDE.md, docs/, rules/)
├── next.config.mjs       Next.js configuration + PWA setup
├── middleware.ts          Auth guard — runs before every request
├── tsconfig.json          TypeScript config (path aliases)
├── eslint.config.mjs     ESLint 9 flat config
└── package.json          pnpm scripts and dependencies
```

---

## app/ — The Entire Application

This is where 95% of the code lives. Next.js App Router maps the filesystem
to URLs.

```
app/
├── layout.tsx                Root HTML shell — MUI provider, auth session, PWA meta
├── page.tsx                  Root redirect (/ → /gustavo or /login)
├── globals.css               Global styles
├── auth.ts                   Auth.js config: Google provider + email allowlist
│
├── api/                      API routes (Next.js Route Handlers)
│   ├── auth/[...nextauth]/   Auth.js endpoints (handled by Auth.js library)
│   ├── health/               GET /api/health — DB ping for monitoring
│   ├── trips/                GET/POST /api/trips
│   │   └── [tripId]/
│   │       ├── route.ts      GET/PUT/DELETE /api/trips/:id
│   │       ├── expenses/     GET/POST /api/trips/:id/expenses
│   │       │   └── [expenseId]/ PUT/DELETE /api/trips/:id/expenses/:expenseId
│   │       ├── locations/    GET/POST + PUT/DELETE for locations
│   │       └── participants/ GET/POST trip participants
│   ├── expense-categories/   GET/POST + PUT/DELETE for categories
│   ├── images/[...path]/     Proxy for receipt images via Vercel Blob
│   └── users/                GET all users
│
├── login/                    Login page with Google Sign-In button
├── auth/error/               Auth error page (wrong account, etc.)
├── offline/                  PWA offline fallback page
├── health/                   Browser-readable health check page
│
├── gustavo/                  The main app (auth-protected)
│   ├── layout.tsx            Persistent header + bottom tab bar for all /gustavo pages
│   ├── page.tsx              Home screen (links to Expenses)
│   ├── expenses/trips/
│   │   ├── page.tsx          Trip list (cards with background images)
│   │   └── [slug]/page.tsx   Trip detail — fetches data, renders Gustavo component
│   └── settings/
│       ├── page.tsx          Settings hub
│       ├── categories/       Manage expense categories (inline edit/delete)
│       └── locations/        Manage trip locations (inline edit/delete)
│
├── components/               Reusable React components
│   ├── expense-form-dialog   Add/edit expense modal
│   ├── delete-expense-dialog Confirm delete expense
│   ├── trip-form-dialog      Create/edit trip modal
│   ├── delete-trip-dialog    Confirm delete trip
│   ├── auth/user-menu        User avatar + sign-out
│   ├── debt/                 Debt calculator view
│   ├── graphs/               Line chart (spending over time)
│   ├── links/                External links view
│   ├── menu/                 Filter/sort/settings menu bar (trip detail view)
│   │   ├── menu.tsx          Main horizontal menu bar
│   │   ├── filter/           Filter by person/paidBy/type/location
│   │   ├── sort/             Sort by cost/date/name
│   │   ├── search/           Fuzzy search bar
│   │   ├── settings/         In-menu settings (icon labels, submit receipt link)
│   │   └── tools/            "Tools" tab switcher (receipts, summary, graph, debt, links)
│   ├── receipts/             Expense list + individual rows with row actions
│   ├── summary/              Summary panels (by person, type, location, date)
│   ├── client-only.tsx       Wrapper to suppress SSR hydration (for Zustand UI)
│   ├── providers.tsx         SessionProvider wrapper (Auth.js)
│   ├── PWAInstallButton      Manual PWA install trigger
│   └── PWAInstallPrompt      Auto prompt for PWA install
│
├── providers/                React Context providers
│   ├── trip-data-provider.tsx   Holds current trip + raw expenses (React state)
│   ├── spend-data-provider.tsx  Derives filtered/sorted data via useMemo (no Zustand)
│   └── refresh-provider.tsx     Passes onRefresh callback down without prop drilling
│
├── hooks/
│   ├── usePWAInstall.tsx     Handles beforeinstallprompt browser event
│   └── useWindowSize.ts      Window dimensions (responsive layout)
│
├── utils/
│   ├── api.ts                All fetch() calls to /api/* — typed, throws on error
│   ├── data-mapping.ts       Maps raw API response shapes (legacy — may simplify later)
│   ├── cache.ts              Simple localStorage/sessionStorage helpers
│   ├── colors.ts             Palette constants
│   ├── currency.ts           Number formatting
│   ├── icons.tsx             Tabler icon lookup by name + menu icon helpers
│   ├── image.ts              Receipt image URL helpers
│   ├── links.ts              External link definitions per trip
│   ├── version.ts            App version string
│   └── index.ts              Re-exports
│
└── views/
    ├── gustavo.tsx            Main trip detail view — layout, swipe gestures, FAB
    ├── trips.tsx              Zustand store for trips loading state (not trip data)
    └── index.ts               Re-exports
```

---

## lib/ — Shared Utilities

```
lib/
├── db.ts         Single shared pg.Pool — imported by all API routes
├── db-audit.ts   withAuditUser() — wraps any DB write in a transaction with
│                 SET LOCAL audit.changed_by so audit triggers know who made changes
└── types.ts      TypeScript types for all DB-backed data:
                  TripSummary, UserSummary, Expense, ExpenseCategory, Location
```

---

## database/ — Schema and Migrations

```
database/
├── migrations/
│   ├── 00001_create_users.sql
│   ├── 00002_create_trips.sql
│   ├── 00003_create_trip_participants.sql
│   ├── 00004_create_locations.sql
│   ├── 00005_create_expenses.sql
│   ├── 00006_create_expense_participants.sql
│   ├── 00007_add_updated_at_trigger.sql    (also includes seed data — migration 00007)
│   ├── 00008_add_trip_slugs.sql
│   ├── 00009_add_audit_log.sql            (audit_log table + triggers)
│   ├── 00010_add_expense_categories.sql   (expense_categories table, FK on expenses)
│   └── 00011_add_user_metadata.sql        (initials + venmo_url columns on users)
└── seeds/
    └── 001_initial_data.sql               (9 users, 4 trips, participants — run manually)
```

Migrations are plain SQL. The runner (`scripts/migrate.js`) tracks applied
migrations in a `schema_migrations` table. Always sequential — never edit
applied migrations, always add new ones.

---

## infra/ — Local Docker Stack

```
infra/
├── docker-compose.yml    Postgres 17.5 (port 5432) + Metabase (port 3001)
└── Dockerfile            node:24-alpine, pnpm-only, multi-stage build
```

The Docker stack is for **local development only**. Production uses Neon
(cloud Postgres) and Vercel (hosting).

---

## scripts/ — DB Management

```
scripts/
├── migrate.js              Runs pending SQL migrations against DATABASE_URL
├── create-migration.sh     Creates a new numbered migration file
├── reset-database.sh       Drops and recreates the local DB (destructive!)
└── test-db-connection.js   Quick sanity check: connects to DB and prints version
```

Common commands:
```bash
pnpm db:migrate             # Apply pending migrations
pnpm db:create-migration <name>   # New migration file
pnpm db:reset               # Reset local DB (local only!)
```

---

## How the Build Works

### Local
```bash
pnpm docker:up    # Starts postgres + metabase in Docker
pnpm dev          # Starts Next.js dev server at localhost:3000
```

In dev, Next.js hot-reloads any file change instantly. API routes reload too.

### Production (Vercel)
Push to the `fullstack` branch → Vercel automatically:
1. Detects pnpm (via `pnpm-lock.yaml` + `packageManager` in package.json)
2. Runs `pnpm install`
3. Runs `pnpm build` (Next.js build = TypeScript compile + route bundling)
4. Deploys the output to their edge network

The build takes ~1-2 minutes. Vercel shows build logs in its dashboard.

**No manual deploy step** — every push to `fullstack` is a deploy.

---

## How Vercel + Neon Work Together

### Neon (Database)
Neon is serverless Postgres. It's exactly like a regular Postgres database
except it scales to zero (no compute cost when idle) and the free tier never
pauses (unlike Supabase).

Connection: `DATABASE_URL` environment variable. Format:
```
postgresql://user:password@host.neon.tech/dbname?sslmode=require
```

In production, `lib/db.ts` creates a `pg.Pool` using this URL with SSL
enabled. In local dev, SSL is disabled (plain Docker Postgres).

### Vercel Environment Variables
Set in Vercel dashboard → Project Settings → Environment Variables:
- `DATABASE_URL` — Neon connection string (injected via Neon integration)
- `AUTH_SECRET` — Random secret for signing Auth.js sessions
- `AUTH_GOOGLE_ID` — Google OAuth client ID
- `AUTH_GOOGLE_SECRET` — Google OAuth client secret

Locally, these live in `env/.env.local` which is gitignored.

### Vercel + Neon Integration
In the Vercel dashboard, the Neon integration auto-injects `DATABASE_URL`
into your project's environment variables. You don't paste the string manually
— Neon handles it. But you can also just paste it manually; both work.

---

## Authentication Flow

1. Unauthenticated user visits any page
2. `middleware.ts` runs (Auth.js middleware) — sees no valid session
3. Redirects to `/login`
4. User clicks "Sign in with Google"
5. Google OAuth redirect → `/api/auth/callback/google`
6. Auth.js checks if the email is in `ALLOWED_EMAILS` in `app/auth.ts`
7. If yes → session cookie set, redirect to `/gustavo`
8. If no → redirect to `/auth/error`

Sessions are stored as signed JWT cookies. No session table in the DB.

To add a user: edit the `ALLOWED_EMAILS` array in `app/auth.ts` and push.
Vercel deploys in ~1 minute. The new user can sign in immediately after.

---

## pnpm Scripts Summary

From `package.json`:

| Script | What it does |
|--------|-------------|
| `pnpm dev` | Start Next.js dev server |
| `pnpm build` | Production build |
| `pnpm start` | Start prod server locally (after build) |
| `pnpm lint` | ESLint check |
| `pnpm docker:up` | Start Postgres + Metabase in Docker |
| `pnpm docker:down` | Stop Docker containers |
| `pnpm docker:logs` | Tail Docker container logs |
| `pnpm db:migrate` | Run pending migrations |
| `pnpm db:reset` | Reset local DB (destructive) |
| `pnpm db:create-migration` | Create new migration file |

---

## Tech Stack Summary

| Layer | Tech |
|-------|------|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript 5.8 |
| UI | MUI v7 (Material UI) |
| Icons | Tabler Icons + Phosphor Icons |
| Charts | visx (D3-based) |
| State (UI) | Zustand 5 |
| State (data) | React Context + useState |
| Database | Postgres (Neon in prod, Docker locally) |
| DB client | node-postgres (pg) |
| Auth | Auth.js v5 (Google OAuth) |
| Hosting | Vercel |
| File storage | Vercel Blob (for receipt images, future) |
| PWA | next-pwa (Workbox service worker) |
| Package manager | pnpm 10 |
| Node version | 24 |
