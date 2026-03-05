# Backfill Implementation Guide

This document is the implementation spec for the model doing the work.
Read it fully before touching any files.

---

## Task Overview

1. Reorganize `scripts/` into subdirectories
2. Create `scripts/backfill/import-expenses.js` — a Node.js script that reads a
   CSV exported from Google Sheets and imports expenses into the DB

---

## Part 1 — Scripts Directory Reorganization

### Target structure

```
scripts/
  db/
    migrate.js              ← was scripts/migrate.js
    seed.js                 ← was scripts/seed.js
    create-migration.sh     ← was scripts/create-migration.sh
    reset-database.sh       ← was scripts/reset-database.sh
    test-db-connection.js   ← was scripts/test-db-connection.js
  setup/
    create-env-local.sh     ← was scripts/create-env-local.sh
  app/
    start.js                ← was scripts/start.js
  backfill/
    data/                   ← already exists, leave contents untouched
    import-expenses.js      ← NEW (see Part 2)
    GUIDE.md                ← this file, leave it here
  README.md                 ← rewrite (see below)
```

**Delete** `scripts/seed-database.sh` — it is stale. It references tables
(`records`, `columns`, `tables`, `table_categories`) that do not exist in this
project's schema. It was generated from an unrelated template.

### package.json updates

After moving files, update the `scripts` block in `package.json`:

| Key | Old value | New value |
|---|---|---|
| `db:create-migration` | `bash scripts/create-migration.sh` | `bash scripts/db/create-migration.sh` |
| `db:migrate` | `node --env-file=.env.local scripts/migrate.js` | `node --env-file=.env.local scripts/db/migrate.js` |
| `db:reset` | `bash scripts/reset-database.sh` | `bash scripts/db/reset-database.sh` |
| `db:seed` | `node --env-file=.env.local scripts/seed.js` | `node --env-file=.env.local scripts/db/seed.js` |
| `dev:reset` | `bash scripts/reset-database.sh && next dev` | `bash scripts/db/reset-database.sh && next dev` |
| `start:local` | `node scripts/start.js` | `node scripts/app/start.js` |
| *(new)* | — | `"db:backfill": "node --env-file=.env.local scripts/backfill/import-expenses.js"` |

### scripts/README.md rewrite

The current README.md is stale (references non-existent npm commands and wrong
credentials). Rewrite it to document the actual current scripts with the new
paths. Match the tone/style of the existing codebase docs.

### Internal script references to check

`scripts/db/reset-database.sh` internally calls `docker-compose -f infra/docker-compose.yml up -d`
and references migration/seed directories by relative path from the repo root — those
paths don't need to change since they point to `database/migrations/` and
`database/seeds/`, not to `scripts/`.

`scripts/db/create-migration.sh` — read it first to check if it has any
hardcoded paths.

---

## Part 2 — import-expenses.js

### Location

`scripts/backfill/import-expenses.js`

### CLI interface

```bash
# Local
pnpm db:backfill -- --file "scripts/backfill/data/2024 Japan Spend.csv" --trip-id 1

# Prod
DATABASE_URL=<neon-url> node scripts/backfill/import-expenses.js \
  --file "scripts/backfill/data/2024 Japan Spend.csv" --trip-id 1

# Flags
--file <path>     required  Path to CSV file
--trip-id <n>     required  DB trip ID (1–4, see mapping below)
--clear           optional  Soft-delete existing expenses for the trip before import
--dry-run         optional  Parse and validate without writing to DB
```

### Trip ID → CSV file mapping

| trip_id | Trip name | CSV filename |
|---|---|---|
| 1 | Japan 2024 | `2024 Japan Spend.csv` |
| 2 | Vancouver 2024 | `2024 Vancouver Spend Tracking.csv` |
| 3 | South Korea 2025 | `2025 South Korea Spend Tracking.csv` |
| 4 | Japan 2025 | `2025 Japan Spend Tracking.csv` |

### Dependencies

Use `csv-parse` for CSV parsing. Check if it is already in `package.json`; if
not, add it. Do not write a bespoke CSV parser — the `parseRow` function in
`app/utils/data-mapping.ts` has known edge cases (it strips quote chars rather
than correctly handling RFC 4180 quoted fields).

All other deps (`pg`, `fs`, `path`) are already available. Follow the exact same
DB connection pattern as `scripts/db/migrate.js` and `scripts/db/seed.js`.

### Column mapping

All 4 CSVs use the same column *names* but in **different orders**. Use
header-based index lookup (same approach as `app/utils/data-mapping.ts`).

| CSV column name | DB field | Notes |
|---|---|---|
| `Date` | `expenses.date` | Parse as DATE; see date anomaly below |
| `Item Name` | `expenses.name` | — |
| `Cost` | `expenses.cost_original` | Strip commas before parseFloat |
| `Converted Cost` | `expenses.cost_converted_usd` | May be `#N/A` → 0, set `conversion_error = true` |
| `Currency` | `expenses.currency` | — |
| `Paid By` | `expenses.paid_by` (user ID) | First-name lookup — see name mapping |
| `Split Between` | `expense_participants` rows | `"Everyone"` = all trip participants; else comma-split + trim |
| `Type of Spend` | `expenses.category` | — |
| `Location` | `expenses.location_id` | Name lookup; auto-create if missing; NULL if empty |
| `Notes` | `expenses.notes` | — |
| `Email Address` | `expenses.reported_by` (user ID) | Email lookup in `users` table |
| `Timestamp` | `expenses.reported_at` | Parse as TIMESTAMPTZ |
| `Upload Receipt` | *(skip)* | Google Drive URLs — not used yet (no `receipt_url` column yet) |

**Columns to ignore:** `Status` (Japan 2024 only), trailing duplicate `Currency`
(Japan 2024 only). Because you're using header-based lookup, these are ignored
automatically — you never read columns you didn't ask for.

### Name → user ID mapping

CSV uses first names only (`Ivan`, `Jenny`, `Joanna`, `Aibek`, `Angela`,
`Lisa`, `Dennis`, `Michelle`, `Suming`). The `users` table stores full names.

Build the map from the DB at startup:

```sql
SELECT id, split_part(name, ' ', 1) AS first_name
FROM users
WHERE deleted_at IS NULL
```

This produces: `{ Ivan: 1, Jenny: 2, Joanna: 3, Aibek: 4, Angela: 5, Lisa: 6, Dennis: 7, Michelle: 8, Suming: 9 }`.

"Suming" is a single-word name — `split_part` returns the whole string when
there's no space, so it works correctly.

If a name is not found: **warn and skip the row** (do not crash). Print the
skipped row at the end of the run.

### Location → location ID mapping

Load all locations for the trip at startup:
```sql
SELECT id, name FROM locations WHERE trip_id = $1 AND deleted_at IS NULL
```

If a location name from the CSV is not in the map: **insert it** (locations are
freeform). Then add it to the in-memory map.

```sql
INSERT INTO locations (trip_id, name) VALUES ($1, $2)
ON CONFLICT (trip_id, name) DO NOTHING
RETURNING id
```

If the Location column is empty → set `location_id = NULL` (nullable in schema).

**Known locations not in seeds that will need auto-creation:**
- Japan 2024: `Nara` (seed has Hakone, Kyoto, Osaka, Tokyo, Other)
- Vancouver 2024: `Squamish` (seed has Vancouver, Other)

### "Everyone" expansion

When `Split Between` = `"Everyone"`, expand to all current trip participants:

```sql
SELECT user_id FROM trip_participants WHERE trip_id = $1 AND left_at IS NULL
```

Load this at startup and cache it.

### Exchange rate computation

No exchange rate column in the CSVs. Compute:
```
exchange_rate = cost_original / cost_converted_usd
```
- If both are equal (USD expense): result is `1.0`
- If `cost_converted_usd` is `0` or `conversion_error` is true: set
  `exchange_rate = NULL`

### Idempotency

With `--clear`: soft-delete all existing expenses for the trip before import:
```sql
UPDATE expenses SET deleted_at = NOW()
WHERE trip_id = $1 AND deleted_at IS NULL
```
Then import fresh.

Without `--clear`: the script will insert duplicate expenses if run twice.
That's intentional — always use `--clear` when re-running a trip import.

### Data anomalies to handle

1. **Japan 2024 date typo**: Row for `Nara Pin` has date `11/24/0024`.
   The year `0024` is clearly `2024`. Apply a correction:
   if parsed year < 100, add 2000. Or simply replace `0024` → `2024` in the
   date string before parsing.

2. **Cost with commas**: Some costs are formatted as `1,779.22`. Strip commas
   before `parseFloat`.

3. **`#N/A` in Converted Cost**: Set `cost_converted_usd = 0` and
   `conversion_error = true`.

4. **Empty Location**: Use `NULL` for `location_id`.

5. **Empty rows**: Skip any row where `Item Name` is empty.

### reported_by lookup

The `Email Address` column contains the submitter's Gmail. Look up by email:
```sql
SELECT id FROM users WHERE email = $1 AND deleted_at IS NULL
```
If not found: set `reported_by = NULL` (nullable in schema). Warn.

### Transaction handling

Wrap each expense + its expense_participants in a single transaction. If
the expense insert fails, roll back just that row, warn, and continue.
Do not wrap the entire file import in one transaction — partial imports are
better than an all-or-nothing failure on a 195-row file.

### Script output

Print a summary at the end:
```
Imported trip: Japan 2024 (id=1)
  Rows processed: 176
  Expenses inserted: 174
  Skipped (unknown person): 0
  Skipped (empty row): 2
  Locations auto-created: 1 (Nara)
Done.
```

### Error handling pattern

Follow `scripts/db/migrate.js` exactly:
- Check `DATABASE_URL` first, exit 1 if missing
- Wrap in try/finally to always close the client
- Exit 1 on fatal errors

---

## Part 3 — Verification

After implementing, test locally:

```bash
# 1. Start Docker
pnpm docker:up

# 2. Reset DB to a clean state with seed data
pnpm db:reset

# 3. Dry run first
pnpm db:backfill -- --file "scripts/backfill/data/2024 Japan Spend.csv" --trip-id 1 --dry-run

# 4. Import all 4 trips
pnpm db:backfill -- --file "scripts/backfill/data/2024 Japan Spend.csv" --trip-id 1 --clear
pnpm db:backfill -- --file "scripts/backfill/data/2024 Vancouver Spend Tracking.csv" --trip-id 2 --clear
pnpm db:backfill -- --file "scripts/backfill/data/2025 South Korea Spend Tracking.csv" --trip-id 3 --clear
pnpm db:backfill -- --file "scripts/backfill/data/2025 Japan Spend Tracking.csv" --trip-id 4 --clear

# 5. Spot-check in DBeaver
# DB: localhost:5432, user: gus, pass: yellow_shirt_dev, db: gustavo_dev
SELECT COUNT(*) FROM expenses WHERE trip_id = 1 AND deleted_at IS NULL;
-- Expected: ~174 (176 rows minus 1 empty, 1 date-typo handled)
```

---

## Key existing files to read before implementing

- `scripts/db/migrate.js` — DB connection pattern to copy exactly
- `scripts/db/seed.js` — same pattern, also shows transaction handling
- `database/seeds/001_initial_data.sql` — shows which users/trips/locations are
  already seeded; name-to-ID mapping is confirmed here
- `.claude/docs/schema.md` — full schema with FK relationships and nullability
- `app/utils/data-mapping.ts` — the old app's CSV parsing logic; useful
  reference for column names and data shapes, but do not copy `parseRow` (use
  csv-parse instead)
