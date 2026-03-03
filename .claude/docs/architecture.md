# Gustavo: Architectural Plan for Full-Stack Evolution

## Context

Gustavo is currently a client-side React app hosted on GitHub Pages that reads expense data from Google Sheets (entered via Google Forms). The goal is to evolve it into a proper full-stack personal app that:
- Works great on mobile (iPhone and Android), primarily as an installed PWA
- Has in-app data entry (replacing Google Forms)
- Restricts access to ~10 known users via Google OAuth + email allowlist
- Keeps maintenance burden extremely low
- Is free or nearly free to run
- Preserves and migrates all historical Google Sheets data into a real database

**Starting point:** The `main-backup-vercel-setup` branch already has Docker Compose (Postgres + pgAdmin + Metabase), Next.js API routes, DB management scripts, and Vercel deployment config. The `local-app-alpha` branch adds one commit with a rough db-admin UI — worth salvaging: `test-db-connection.js` script and the pg pool connection pattern in `app/api/db-app/`.

---

## Architecture Decisions

### Mobile: PWA (not native)
- No App Store distribution — not worth the cost/complexity for <10 users ($99/yr Apple Developer account, app review process)
- A properly configured PWA, once "Add to Home Screen" is used, hides browser chrome and behaves like a native app
- UX issues from previous PWA attempt are fixable in code: `overscroll-behavior: none`, `touch-action`, safe area insets
- React Native would require rewriting the entire UI layer in native components

### Database: Neon (not Supabase)
- The existing Docker branch uses plain PostgreSQL — Neon is the same in the cloud
- DBeaver and Metabase connect to Neon identically to local Postgres (same connection string format)
- Vercel + Neon have a first-class integration (auto-injects connection string env vars)
- Supabase free tier **pauses after 1 week of inactivity** — bad for an app used infrequently
- Standard Postgres = easy dump/restore, no vendor magic to debug

### Auth: Auth.js (NextAuth.js v5)
- Open-source library, no external service, free forever, entirely self-contained
- Built-in Google OAuth provider
- Email allowlist is ~5 lines of code in a `signIn` callback — update `ALLOWED_EMAILS` array + push to add a user
- Native Next.js App Router support (middleware, server components, route protection)
- Sessions stored in Neon or as signed JWT cookies

### File Storage: Vercel Blob
- Receipt image uploads; 1GB free; same ecosystem as Vercel hosting
- Simple SDK: `put()`, `get()`, `del()`

### Hosting: Vercel
- Free tier; push to branch → auto deploy; preview deployments on every PR
- Neon and Vercel Blob are Vercel-ecosystem products — env vars auto-injected

### Framework: Next.js 15 (App Router)
- Upgrade from Next.js 14 (on infra branch) to 15 in Phase 1
- App Router with API routes — no separate backend server needed
- PWA support via `next-pwa`
- Best Vercel support of any framework

### Package Manager: pnpm (replacing yarn)
- Faster installs (hard links, shared global cache)
- Stricter (no phantom dependencies)
- Now the standard in the Vite/Next.js/Nuxt ecosystem
- Migration: `pnpm import` converts yarn.lock, then delete it

---

## Recommended Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 15 (App Router) + TypeScript 5.8 |
| PWA | next-pwa |
| State | Zustand 5 (stable) |
| UI | MUI v7 |
| Package manager | pnpm |
| Database (prod) | Neon (serverless Postgres) |
| Database (local dev) | Docker Postgres 17 |
| Auth | Auth.js v5 (Google OAuth + email allowlist in code) |
| File storage | Vercel Blob |
| Hosting | Vercel |
| CI/CD | Vercel GitHub integration |
| DB GUI (local) | DBeaver desktop app |
| Analytics (local) | Metabase (Docker) |
| Component dev (future) | Storybook v8 — add during mobile UX polish phase |

---

## Supabase vs Neon (decision log)

| | Supabase | Neon |
|---|---|---|
| What it is | Full BaaS (DB + Auth + Storage + more) | Serverless PostgreSQL only |
| Auth | Built in | Not included — use Auth.js |
| File storage | Built in | Not included — use Vercel Blob |
| Local dev story | Heavy CLI stack | Plain Docker Postgres (matches existing setup) |
| DBeaver / Metabase | Works, extra complexity | Connects like any standard Postgres |
| Free tier caveat | **Pauses after 1 week inactivity** | Scales to zero, never pauses |
| Data portability | Postgres under the hood | Standard Postgres dump/restore |

---

## Branch Strategy

```
main                     ← GitHub Pages source (keep untouched)
  └── japan2025          ← current/future trip work, merges → main as usual
  └── fullstack          ← new full-stack app (based on main-backup-vercel-setup)
        └── feature/*    ← feature branches off fullstack
```

GitHub Pages deploys from the `gh-pages` branch (`npm run deploy`). Vercel deploys from `fullstack`. Both run simultaneously with no conflict.

When ready to cut over: merge `fullstack` → `main`, update Vercel to track `main`, retire GitHub Pages.

---

## Model Selection Guide

- **Sonnet 4.6** — default for all implementation sessions (Phases 1–4): package installs, config, writing code, debugging. Fast and capable for these tasks.
- **Opus 4.6** — switch for complex architectural decisions (e.g., DB schema design in Phase 5), security design, or hard multi-file bugs needing deep reasoning.
- **Haiku 4.5** — quick lookups, simple single-file edits.

Running the plan past Opus before implementation is generally not worth it for a well-trodden stack. Opus adds value when the problem is novel — save it for those moments.

---

## Phase Plan

### Phase 1: Tech Stack Modernization
**Goal:** Clean, modern foundation before any infra work. Create `fullstack` branch from `main-backup-vercel-setup`.

**Package manager:**
- Switch yarn → pnpm: `pnpm import` → delete `yarn.lock`
- Update all scripts in `package.json` (`yarn` → `pnpm`)

**Dependency upgrades:**

| Package | From | To | Notes |
|---|---|---|---|
| `next` | `^14` | `^15` | Breaking: `fetch` caching defaults changed to opt-in |
| `react` / `react-dom` | `^18.2` | `^19` | Upgrade together with Next.js 15 |
| `typescript` | `^5.0` | `^5.8` | Safe, no breaking changes |
| `zustand` | `^5.0.0-rc.2` | `^5.0.3` | Fix: was on release candidate in production |
| `@mui/material` | `^6.1.1` | `^7` | Reconcile branch divergence |
| `eslint` | `^8` | `^9` | Breaking: new flat config format (`eslint.config.js`) |
| `@types/node` | `^20` | `^24` | Match runtime Node version |
| `@types/react` | `^18.0` | `^19` | Match React version |

**Docker fixes:**
- Unify both Docker stages to `node:24-alpine` — Node 24 is the current LTS (active until Oct 2027, maintenance until Apr 2029); longer runway than Node 22 for a low-maintenance app
- Remove pgAdmin service from `docker-compose.yml` (use DBeaver desktop app instead)

**Other:**
- Add `.nvmrc` with `24` for local Node version pinning
- Port `scripts/test-db-connection.js` from `local-app-alpha`

**Verification:**
- [ ] `pnpm install` succeeds
- [ ] `pnpm dev` starts without errors
- [ ] `pnpm build` succeeds
- [ ] `pnpm tsc --noEmit` passes

---

### Phase 2: Full Local Stack in Docker
**Goal:** Frontend + backend (Next.js) + Postgres + Metabase all running locally. No DB tables required yet.

Docker services (`infra/docker-compose.yml`):
- `postgres:17` → port 5432
- `metabase` → port 3001

Steps:
1. `pnpm docker:up` → verify both containers healthy
2. `pnpm dev` → app loads at localhost:3000
3. Connect DBeaver to `localhost:5432` (user: `gus`, pass: `yellow_shirt_dev`, db: `gustavo_dev`)
4. Connect Metabase to Postgres at localhost:3001
5. `node scripts/test-db-connection.js` → "Connection successful"
6. Confirm existing app features work (trips, expenses, debt calculator)

Local env: `DATABASE_URL=postgresql://gus:yellow_shirt_dev@localhost:5432/gustavo_dev`

`package.json` scripts:
```json
"docker:up": "docker compose -f infra/docker-compose.yml up -d",
"docker:down": "docker compose -f infra/docker-compose.yml down",
"docker:logs": "docker compose -f infra/docker-compose.yml logs -f"
```

**Verification:**
- [ ] `pnpm docker:up` → all containers healthy
- [ ] `pnpm dev` → app loads at localhost:3000
- [ ] DBeaver connects to localhost:5432 successfully
- [ ] Metabase loads at localhost:3001 and connects to Postgres
- [ ] `node scripts/test-db-connection.js` → "Connection successful"

---

### Phase 3: Deploy to Vercel + Neon
**Goal:** Live production deployment — same app, cloud DB, accessible from anywhere.

1. Create Neon project (free tier) at neon.tech — copy connection string
2. Create Vercel project → connect GitHub repo → set branch to `fullstack`
3. Add Neon integration in Vercel dashboard (auto-injects `DATABASE_URL`)
4. Push to `fullstack` → Vercel auto-builds and deploys
5. Verify `/api/health` returns 200 and confirms DB connection

**Verification:**
- [ ] Vercel URL is live and app loads
- [ ] `/api/health` confirms DB connection
- [ ] Push a small change → Vercel auto-deploys within ~1 min

---

### Phase 4: Google SSO with Email Whitelist
**Goal:** Only whitelisted users can access the app.

**Google Cloud Console (one-time, free):**
1. Create project → enable Google Identity API
2. Create OAuth 2.0 credentials → Client ID + Secret
3. Add redirect URIs: `https://your-app.vercel.app/api/auth/callback/google` + `http://localhost:3000/api/auth/callback/google`

**Auth.js setup:**
1. `pnpm add next-auth @auth/pg-adapter`
2. Create `auth.ts`:
   ```typescript
   import NextAuth from 'next-auth'
   import Google from 'next-auth/providers/google'

   const ALLOWED_EMAILS = [
     'your@gmail.com',
     'friend@gmail.com',
     // update this array + redeploy to add users
   ]

   export const { handlers, auth, signIn, signOut } = NextAuth({
     providers: [Google],
     callbacks: {
       signIn: ({ user }) => ALLOWED_EMAILS.includes(user.email ?? ''),
     },
   })
   ```
3. Add `app/api/auth/[...nextauth]/route.ts`
4. Add middleware to protect all routes except `/api/auth/*`
5. Add login page with "Sign in with Google" button
6. Add to Vercel env vars: `AUTH_SECRET`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`

**Verification:**
- [ ] Whitelisted email can sign in with Google
- [ ] Non-whitelisted email sees "Access Denied"
- [ ] Session persists after page refresh
- [ ] Works on local dev AND production Vercel URL

---

### Phase 5: Feature Development (future)
Order TBD. Candidates:

- **Data layer:** DB schema design, one-time migration script to move Google Sheets data into Neon, replace CSV fetch with API queries
- **In-app data entry:** Mobile-friendly expense entry form (bottom sheet or modal) replacing Google Forms
- **PWA / mobile UX:** `display: standalone`, `overscroll-behavior: none`, safe area insets, bottom nav bar, smooth transitions
- **Storybook v8:** Add when building polished mobile UI components (great for developing in isolation)
- **Dark mode, graph improvements, debt calculator enhancements**

---

## CI/CD

- Vercel GitHub integration: push to `fullstack` → auto deploy (no config needed after initial setup)
- Every PR → preview deployment at unique URL
- Optional GitHub Actions quality gates:
  ```yaml
  - pnpm tsc --noEmit
  - pnpm lint
  - pnpm build
  ```

---

## Cost

| Service | Free Tier | Cost |
|---|---|---|
| Neon | 0.5GB storage, compute scales to zero | **Free** |
| Vercel | 100GB bandwidth, unlimited deploys | **Free** |
| Auth.js | Open-source library | **Free** |
| Vercel Blob | 1GB storage | **Free** |
| Domain (optional) | — | ~$12/yr |

**Total: $0/month** — review Neon/Vercel detailed pricing and backup options separately before going live.

---

## Key Files

| File/Path | Action |
|---|---|
| `src/helpers/spend.ts` | Keep — Spend interface reusable |
| `src/helpers/data-processing.ts` | Keep — debt calc logic reusable |
| `src/helpers/data-mapping.ts` | Replace in Phase 5 — becomes DB queries |
| `src/components/` | Keep all — UI components reusable |
| `infra/docker-compose.yml` | Update: remove pgAdmin, unify Node to 24 |
| `app/api/` | Evolve: add CRUD routes in Phase 5 |
| `scripts/test-db-connection.js` | Port from `local-app-alpha` |
| `env/.env.local` | Update for Neon + Auth.js keys |
| `.nvmrc` | Done: pinned to `24` |
| `infra/Dockerfile` | Done: both stages on `node:24-alpine` |
