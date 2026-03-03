# Gustavo — Project Context

## What this is
Personal travel expense tracking PWA. Next.js + TypeScript frontend,
Neon (Postgres) for DB, Auth.js for auth, Vercel Blob for storage, deployed on Vercel.

## Branch strategy
- `main` → GitHub Pages (existing app, keep untouched)
- `fullstack` → new full-stack app, Vercel watches this branch
- Trip-specific work (Japan 2025, etc.) → branch off `main`, merge back as usual
- When fullstack app is ready to replace old one: merge `fullstack` → `main`

## Local dev
- Start Docker stack: `docker compose -f infra/docker-compose.yml up -d`
- Start app: `npm run dev`
- DB GUI: DBeaver → localhost:5432, user: gus, pass: yellow_shirt_dev, db: gustavo_dev
- Analytics: Metabase → localhost:3001

## Key decisions
- PWA (not native) — no App Store distribution needed for <10 users
- Neon for DB: standard Postgres, scales to zero, first-class Vercel integration
- Auth.js v5 for auth: Google OAuth + email allowlist in `auth.ts` config
- Add/remove users: update email array in `auth.ts`, push to main (no dashboard needed)
- Person names stored as strings (not user IDs) for simplicity and Google Sheets migration ease
- Vercel Blob for receipt image storage

## Architecture notes
- Debt calculation logic: src/helpers/data-processing.ts (keep, reuse)
- API routes: app/api/ (Next.js App Router)
- DB queries: backend/ folder
- Zustand stores: src/stores/
- Infra: infra/docker-compose.yml (Postgres + Metabase, no pgAdmin — use DBeaver)

## Deploying
Push to `fullstack` (or eventually `main`) → Vercel auto-deploys. No manual steps.

## Detailed architecture plan
See .claude/docs/architecture.md
