# Database

## Structure

```
database/
├── migrations/   # SQL migration files (00001_description.sql, 00002_...)
├── seeds/        # Seed data for local development
└── schema/       # Generated complete schema (for reference only)
```

## Running Migrations

```bash
# Local (reads DATABASE_URL from .env.local)
pnpm db:migrate

# Against Neon / production
DATABASE_URL=<neon-url> node scripts/migrate.js
```

Migrations are tracked in the `schema_migrations` table — each file runs exactly once.

## Creating a Migration

```bash
pnpm db:create-migration <description>
# e.g. pnpm db:create-migration create_trips_table
# creates database/migrations/00001_create_trips_table.sql
```

Edit the generated file, then run `pnpm db:migrate`.

## Resetting Local DB

```bash
pnpm db:reset
```
