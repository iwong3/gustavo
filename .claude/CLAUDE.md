# Gustavo — Project Context

## What this is
Personal travel expense tracking PWA. Next.js 15 + TypeScript frontend,
Neon (Postgres) for DB, Auth.js for auth, Vercel Blob for storage, deployed on Vercel.

## Branch strategy
- `main` → GitHub Pages (existing app, keep untouched)
- `fullstack` → new full-stack app (based on `main-backup-vercel-setup`), Vercel watches this branch
- Trip-specific work (Japan 2025, etc.) → branch off `main`, merge back as usual
- When fullstack app is ready to replace old one: merge `fullstack` → `main`

## Package manager: pnpm (not yarn, not npm)
Always use `pnpm` for installs and scripts.

## Local dev
- Start Docker stack: `pnpm docker:up` (or `docker compose -f infra/docker-compose.yml up -d`)
- Start app: `pnpm dev`
- DB GUI: DBeaver → localhost:5432, user: gus, pass: yellow_shirt_dev, db: gustavo_dev
- Analytics: Metabase → localhost:3001
- Test DB connection: `node scripts/test-db-connection.js`

## Key decisions
- PWA (not native) — no App Store distribution needed for <10 users
- Neon for DB: standard Postgres, scales to zero, first-class Vercel integration; free tier never pauses
- Auth.js v5 for auth: Google OAuth + email allowlist in `auth.ts` (`ALLOWED_EMAILS` array)
- Add/remove users: update `ALLOWED_EMAILS` in `auth.ts`, push to deploy
- Person names stored as strings (not user IDs) for simplicity and Google Sheets migration ease
- Vercel Blob for receipt image storage
- Storybook v8: add during mobile UX polish phase (not yet)
- Soft deletes preferred over hard deletes (see .cursor/rules/databases.mdc)

## Phase status
1. Tech stack modernization (pnpm, Next.js 15, React 19, Zustand stable, ESLint 9, etc.)
2. Full local stack in Docker (frontend + backend + Postgres + Metabase, no tables needed yet)
3. Deploy to Vercel + Neon
4. Google SSO with email whitelist (Auth.js)
5. Feature development (data layer, data entry, mobile UX polish)

## Architecture notes
- Debt calculation logic: src/helpers/data-processing.ts (keep, reuse)
- API routes: app/api/ (Next.js App Router)
- DB queries: backend/ folder
- Infra: infra/docker-compose.yml (Postgres + Metabase only — no pgAdmin, use DBeaver)
- `local-app-alpha` branch has useful reference: pg pool connection pattern in app/api/db-app/

## Deploying
Push to `fullstack` → Vercel auto-deploys. No manual steps.

## Detailed architecture plan
See .claude/docs/architecture.md
