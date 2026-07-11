---
name: new-migration
description: Create a new database migration for the Gustavo app. Use whenever a schema change is needed — new table, column, index, trigger, or data backfill.
---

# New Migration

## Steps

1. **Create the file**: `pnpm db:create-migration <snake_case_description>` — this
   creates the next-numbered file in `database/migrations/`. (If the script fails on
   Windows, create `database/migrations/NNNNN_description.sql` by hand using the next
   number.)

2. **Write the SQL**, following house conventions:
   - Header comment: migration number, date, purpose, and any non-obvious reasoning.
   - `BIGINT GENERATED ALWAYS AS IDENTITY` PKs; TEXT instead of Postgres ENUMs.
   - Soft deletes: long-lived entities get `deleted_at TIMESTAMPTZ` (and partial
     indexes `WHERE deleted_at IS NULL`).
   - `created_at TIMESTAMPTZ NOT NULL DEFAULT now()`, `updated_at TIMESTAMPTZ` with a
     `set_updated_at()` trigger (`updated_at` is also the optimistic-concurrency token).
   - Audit: `CREATE TRIGGER audit_<table> AFTER INSERT OR UPDATE OR DELETE ... EXECUTE
     FUNCTION audit_trigger_func();` — but **NEVER on tables with composite PKs** (the
     function reads `NEW.id` and blows up; see migration 00036).
   - Library tables (user-defined name lists): unique partial index on
     `(user_id, lower(name)) WHERE deleted_at IS NULL`.
   - Migrating data? Make it idempotent-safe where cheap (`IF EXISTS` guards) — local
     and prod DBs can be at different states.

3. **Never edit an applied migration** — always add a new one.

4. **Run locally**: `pnpm db:migrate` (Docker stack must be up: `pnpm docker:up`).
   If it fails midway, fix and `pnpm db:reset` if needed (local only, destructive).

5. **Update `.claude/docs/schema.md`** in the same change: ER diagram entry, the
   "current through migration NNNNN" header line, and Key Design Decisions if the
   migration embodies one.

6. **Update `lib/types.ts` / `lib/health-types.ts`** and affected API routes.

7. **Remind the user at the end**: prod (Neon) migrations are manual — run
   `pnpm db:migrate:prod` around the deploy. Flag whether the app code change is
   backward-compatible with the old schema (determines migrate-before vs after deploy).
