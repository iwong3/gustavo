# Scripts

## Directory structure

```
scripts/
  db/        Database management (migrate, seed, reset)
  setup/     One-time local environment setup
  app/       App runtime helpers
  backfill/  CSV import scripts and data files
```

## Common commands

All commands run from the repo root.

### Database

```bash
pnpm db:migrate           # Apply pending migrations (local)
pnpm db:seed              # Load seed data (local)
pnpm db:reset             # Drop + recreate DB, run migrations + seeds (local Docker)
pnpm db:create-migration  # Scaffold a new migration file
```

Run against prod by passing `DATABASE_URL` directly:
```bash
DATABASE_URL=<neon-url> node scripts/db/migrate.js
```

### Backfill (Google Sheets → DB)

```bash
pnpm db:backfill -- --file "scripts/backfill/data/2024 Japan Spend.csv" --trip-id 1
pnpm db:backfill -- --file "scripts/backfill/data/2024 Vancouver Spend Tracking.csv" --trip-id 2
pnpm db:backfill -- --file "scripts/backfill/data/2025 South Korea Spend Tracking.csv" --trip-id 3
pnpm db:backfill -- --file "scripts/backfill/data/2025 Japan Spend Tracking.csv" --trip-id 4
```

Add `--clear` to wipe existing trip expenses before importing (safe to re-run).
Add `--dry-run` to validate without writing.

Run against prod:
```bash
DATABASE_URL=<neon-url> node scripts/backfill/import-expenses.js --file ... --trip-id 1
```

### Local dev setup

```bash
bash scripts/setup/create-env-local.sh   # Create .env.local from template
node scripts/db/test-db-connection.js    # Verify DB connection
```

## Local DB connection

- Host: `localhost:5432`
- DB: `gustavo_dev`
- User: `gus`
- Password: `yellow_shirt_dev`
- GUI: DBeaver (preferred) or `pnpm docker:up` then connect
