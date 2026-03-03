# Gustavo: Architectural Plan for Full-Stack Evolution

## Context

Gustavo is currently a client-side React app hosted on GitHub Pages that reads expense data from Google Sheets (entered via Google Forms). The goal is to evolve it into a proper full-stack personal app that:
- Works great on mobile (iPhone and Android), primarily as an installed PWA
- Has in-app data entry (replacing Google Forms)
- Restricts access to ~10 known users via Google OAuth + email allowlist
- Keeps maintenance burden extremely low
- Is free or nearly free to run
- Preserves and migrates all historical Google Sheets data into a real database

**Existing infra work is on the `main-backup-vercel-setup` branch** — this is the starting point, not a blank slate. It already has Docker Compose (Postgres + pgAdmin + Metabase), Next.js API routes, DB management scripts, and Vercel deployment config.

---

## Architecture Decisions

### Mobile: PWA (not native)
- No App Store distribution — not worth the cost/complexity for <10 users ($99/yr Apple Developer account, app review process)
- A properly configured PWA, once "Add to Home Screen" is used, hides browser chrome and behaves like a native app
- The UX issues previously experienced with PWA are fixable in code (see Phase 2 below)
- React Native would require rewriting the entire UI layer in native components

### Database: Neon (not Supabase)
- The existing Docker branch already uses plain PostgreSQL — Neon is the same thing in the cloud
- DBeaver and Metabase connect to Neon identically to local Postgres
- Vercel + Neon have a first-class integration (auto-injects connection string env vars)
- Supabase's free tier pauses after 1 week of inactivity — bad for an app touched infrequently
- Standard Postgres = easy to dump/restore, no vendor magic to debug

### Auth: Auth.js (NextAuth.js v5)
- Neon doesn't include auth — Auth.js fills this gap
- Open-source library, no external service, free forever, entirely self-contained
- Has a built-in Google OAuth provider
- Email allowlist is a callback in code (~5 lines) — to add a user, update an array and push
- Native Next.js App Router support (middleware, server components, route protection)
- Sessions stored in Neon (already have it) or as signed JWT cookies
- No 3rd party service dependency, no dashboard — just a library you own

### File Storage: Vercel Blob
- Receipt image uploads
- 1GB free, already on Vercel so no additional service to manage
- Simple SDK: `put()`, `get()`, `del()`

### Hosting: Vercel
- Free tier for personal projects
- Push to branch → auto deploy (no config after initial setup)
- Preview deployments on every PR
- Neon and Vercel Blob are both Vercel-ecosystem products — env vars auto-injected

### Framework: Next.js (already on the infra branch)
- The `main-backup-vercel-setup` branch already migrated to Next.js
- App Router with API routes — no separate backend server needed
- PWA support via `next-pwa` (already configured on the branch)
- Better Vercel support than plain Vite (API routes, server components, etc.)

---

## Recommended Stack Summary

| Layer | Technology |
|---|---|
| Frontend | Next.js (App Router) + TypeScript |
| PWA | next-pwa (already configured) |
| State | Zustand (keep existing) |
| UI | MUI (keep existing) |
| Database (prod) | Neon (serverless Postgres) |
| Database (local dev) | Docker Postgres 17 |
| Auth | Auth.js v5 (Google OAuth + email allowlist in code) |
| File storage | Vercel Blob |
| Hosting | Vercel |
| CI/CD | Vercel GitHub integration |
| DB GUI (local) | DBeaver → connects to Docker Postgres |
| Analytics (local) | Metabase → connects to Docker Postgres |

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
| Data portability | It's Postgres under the hood | Standard Postgres dump/restore |

Neon chosen because: matches existing Docker setup, no pause behavior, standard Postgres everywhere.

---

## Local Development Stack (Docker Compose)

The `main-backup-vercel-setup` branch has `infra/docker-compose.yml` with:
- **Postgres 17** (port 5432) — primary DB
- **Metabase** (port 3001) — analytics connecting to local Postgres
- **pgAdmin** (port 8080) — replaced by DBeaver (desktop app, no container needed)

**Recommended:** Remove pgAdmin from docker-compose, keep Postgres + Metabase.

**DBeaver connection:**
- Local: `localhost:5432`, user `gus`, password `yellow_shirt_dev`, db `gustavo_dev`
- Production: Neon connection string from Neon dashboard

```bash
docker compose -f infra/docker-compose.yml up -d   # start local stack
npm run dev                                          # start Next.js
```

Environment vars:
- Local dev: `DATABASE_URL=postgresql://gus:yellow_shirt_dev@localhost:5432/gustavo_dev`
- Production: injected automatically by Vercel from Neon integration

---

## Branch Strategy

Keep the existing GitHub Pages app live while developing the new stack in parallel.

```
main                     ← GitHub Pages source (keep untouched)
  └── japan2025          ← current/future trip work, merges → main as usual
  └── fullstack          ← new full-stack app (based on main-backup-vercel-setup)
        └── feature/*    ← feature branches off fullstack
```

- **`main`** stays clean — GitHub Pages keeps deploying to `iwong3.github.io/gustavo`
- **`fullstack`** is the new stack — Vercel watches this branch
- Trip-specific changes (Japan 2025, future trips) still branch off `main` and merge back as normal
- When the full-stack app is ready to replace the old one: merge `fullstack` → `main`, update Vercel to track `main`, retire GitHub Pages

**GitHub Pages and Vercel are completely independent.** GitHub Pages deploys from the `gh-pages` branch (created by `npm run deploy`). Vercel deploys from whatever branch you configure. Both can run simultaneously.

---

## Phase Plan

The goal initially is to **get the infra running and a deployable app** — full DB schema and features come later.

### Phase 0: Baseline — Get infra branch running locally
**Goal:** Clean working state of `main-backup-vercel-setup`.

1. Checkout `main-backup-vercel-setup`, review what's there
2. Ensure `docker compose up` brings up Postgres + Metabase cleanly
3. Remove pgAdmin from docker-compose (DBeaver replaces it)
4. Ensure `npm run dev` starts the Next.js app without errors
5. Connect DBeaver to local Postgres — verify connection
6. Connect Metabase to local Postgres — verify connection
7. Confirm existing app features still work

### Phase 1: Production infra setup
**Goal:** Live deployment on Vercel backed by Neon with auth.

1. Create Neon project (free tier) — copy connection string
2. Create Vercel project, connect to GitHub repo (`fullstack` branch)
3. Add Neon integration in Vercel dashboard (auto-injects `DATABASE_URL`)
4. Deploy to Vercel — confirm the app loads
5. Set up Auth.js v5:
   - Install `next-auth` and `@auth/pg-adapter`
   - Create Google OAuth app in Google Cloud Console (free) — get client ID + secret
   - Add `AUTH_SECRET`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET` to Vercel env vars
   - Configure `auth.ts` with Google provider + `signIn` callback checking allowed emails
   - Email allowlist: array of Gmail addresses in `auth.ts` config
6. Add auth middleware (protect all routes except `/auth/signin`)
7. Add login page with "Sign in with Google" button
8. Test: verify non-whitelisted emails are rejected

### Phase 2: PWA setup and mobile UX fixes
**Goal:** App installable on iPhone/Android, browser UX issues resolved.

`next-pwa` already configured. Verify and extend:

1. Confirm PWA manifest (`display: standalone`, correct icons, theme color `#FBBC04`)
2. Add global CSS fixes:
   ```css
   html, body {
     overscroll-behavior: none;            /* no pull-to-refresh, no swipe-back */
     -webkit-overflow-scrolling: touch;
   }
   body {
     padding-top: env(safe-area-inset-top);       /* iPhone notch */
     padding-bottom: env(safe-area-inset-bottom); /* home indicator */
   }
   ```
3. Fix `touch-action` on swipeable components
4. Test iPhone: Safari → Add to Home Screen → no browser chrome
5. Test Android: Chrome → Install → no browser chrome

### Phase 3: Data layer — replace Google Sheets with Neon
**Goal:** App reads from real database, historical data migrated.

1. Define minimal schema (trips + expenses + splits — details TBD)
2. Write one-time migration script (`scripts/migrate-sheets.ts`):
   - Reuse existing `fetchData()` CSV logic
   - Transform rows → DB inserts into Neon
3. Replace Google Sheets data fetching with Postgres queries via API routes
4. Verify historical trips display correctly and debt calculator produces correct results

### Phase 4: In-app data entry
**Goal:** Replace Google Forms.

1. "Add Expense" UI — mobile-friendly bottom sheet or modal
2. POST to `/api/expenses` → insert to Neon
3. Expense appears immediately (optimistic update or refetch)
4. Optional: receipt image upload to Vercel Blob

### Phase 5: Mobile UX polish (ongoing)
- Bottom navigation bar
- Smooth page transitions
- Keyboard handling (inputs not hidden by virtual keyboard)
- Dark mode

---

## CI/CD

- Connect GitHub repo to Vercel (one-time)
- Push to `fullstack` → auto deploy to production Vercel URL
- Every PR → preview deployment at unique URL
- No GitHub Actions required for basic deploys

Optional quality gates (`.github/workflows/ci.yml`):
```yaml
- npx tsc --noEmit
- npx eslint src/
- npm run build
```

---

## Cost Estimate

| Service | Free Tier | Cost |
|---|---|---|
| Neon | 0.5GB storage, compute scales to zero | **Free** |
| Vercel | 100GB bandwidth, unlimited deploys | **Free** |
| Auth.js | Open-source library | **Free** |
| Vercel Blob | 1GB storage | **Free** |
| Domain (optional) | — | ~$12/yr |

**Total: $0/month**

---

## Key Existing Files

| File/Path | Status |
|---|---|
| `src/helpers/spend.ts` | Keep — Spend interface stays valid |
| `src/helpers/data-processing.ts` | Keep — debt calculation logic reusable |
| `src/helpers/data-mapping.ts` | Replace in Phase 3 — becomes DB queries |
| `src/helpers/trips.ts` | Evolve in Phase 3 — trip config moves to DB |
| `src/components/` | Keep all — UI components reusable |
| `infra/docker-compose.yml` | Evolve — remove pgAdmin, keep Postgres + Metabase |
| `app/api/` | Evolve — add expense CRUD routes |
| `backend/` | Evolve — add DB query logic |
| `scripts/` | Add migration script here |
| `env/.env.local` | Keep structure, update keys for Neon + Auth.js |

---

## Verification Checklist

**Phase 0:**
- [ ] `docker compose up` → Postgres and Metabase containers healthy
- [ ] DBeaver connects to localhost:5432 successfully
- [ ] Metabase connects to Postgres
- [ ] `npm run dev` → app loads, existing trips display

**Phase 1:**
- [ ] Vercel URL is live and app loads
- [ ] Neon database connected (API health route confirms)
- [ ] Whitelisted email can sign in with Google
- [ ] Non-whitelisted email is rejected at login

**Phase 2:**
- [ ] iPhone: Add to Home Screen → opens without Safari chrome
- [ ] No pull-to-refresh on scroll up
- [ ] No accidental swipe-back navigation

**Phase 3:**
- [ ] Migration script runs without errors
- [ ] All historical trips visible, loaded from Neon
- [ ] Debt calculator produces correct results

**Phase 4:**
- [ ] New expense can be added from within the app
- [ ] Expense appears in list immediately
