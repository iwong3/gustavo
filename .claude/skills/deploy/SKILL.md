---
name: deploy
description: Deploy the Gustavo app to production. Use when the user says to deploy, ship, push to prod, or release changes.
---

# Deploy Checklist

Production = push to `main` (Vercel auto-deploys in ~1-2 min). Real users: Ivan +
Jenny daily (health), friends/family during trips (expenses). Don't ship broken.

## Steps

1. **Verify locally** (all must pass):
   - `pnpm tsc --noEmit`
   - `pnpm lint`
   - `pnpm build`
   - `pnpm check:cycles` (circular imports crash on hard refresh, not in dev nav)

2. **Check for pending migrations**: compare `database/migrations/` against what prod
   has (`pnpm db:migrate:prod` is a no-op if none pending — but know the answer before
   pushing). If there IS a pending migration, decide ordering:
   - Schema change is **additive** (new table/column) → migrate prod BEFORE pushing.
   - Schema change **breaks old code** (drop/rename) → confirm the deployed code no
     longer reads it, then migrate AFTER the deploy. When unsure, ask the user.

3. **Commit + push to `main`** (get user confirmation for the push if not already given).

4. **Run prod migration if pending**: `pnpm db:migrate:prod` (uses .env.production.local).

5. **Verify live**: check the Vercel deployment succeeded (dashboard or `vercel` CLI /
   Vercel MCP tools), then hit the production app — the `/health` status page confirms
   DB connectivity; spot-check the feature that changed.

6. **If the deploy broke something**: Vercel dashboard → previous deployment → "Promote
   to Production" is the fastest rollback (schema rollbacks need a new migration).
