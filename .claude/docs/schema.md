# Database Schema

## ER Diagram

```
users
  id BIGINT PK
  email TEXT (unique, nullable)
  name TEXT
  avatar_url TEXT
  created_at, updated_at, deleted_at

trips
  id BIGINT PK
  name TEXT
  description TEXT
  start_date DATE
  end_date DATE
  created_by BIGINT FK → users
  created_at, updated_at, deleted_at

trip_participants
  id BIGINT PK
  trip_id BIGINT FK → trips
  user_id BIGINT FK → users
  joined_at TIMESTAMPTZ
  left_at TIMESTAMPTZ
  UNIQUE(trip_id, user_id)

locations
  id BIGINT PK
  trip_id BIGINT FK → trips
  name TEXT
  created_at, deleted_at
  UNIQUE(trip_id, name)

expenses
  id BIGINT PK
  trip_id BIGINT FK → trips
  name TEXT
  date DATE
  cost_original NUMERIC(12,2)
  currency TEXT
  cost_converted_usd NUMERIC(12,2)
  exchange_rate NUMERIC(16,8)
  conversion_error BOOLEAN
  category TEXT
  location_id BIGINT FK → locations
  paid_by BIGINT FK → users
  notes TEXT
  reported_by BIGINT FK → users
  reported_at TIMESTAMPTZ
  created_at, updated_at, deleted_at

expense_participants
  id BIGINT PK
  expense_id BIGINT FK → expenses (CASCADE)
  user_id BIGINT FK → users
  UNIQUE(expense_id, user_id)
```

## Relationships

```
users 1──∞ trips (created_by)
users 1──∞ trip_participants
trips 1──∞ trip_participants
trips 1──∞ locations
trips 1──∞ expenses
users 1──∞ expenses (paid_by)
users 1──∞ expenses (reported_by)
locations 1──∞ expenses
expenses 1──∞ expense_participants
users 1──∞ expense_participants
```

## Key Design Decisions

- **BIGINT PKs** — simpler and more efficient than UUID for a single-DB personal app
- **TEXT for category/currency** — no Postgres ENUMs (can't remove values). Validated in app code.
- **Soft deletes** — `deleted_at TIMESTAMPTZ` on users, trips, locations, expenses. All queries should filter `WHERE deleted_at IS NULL`.
- **Freeform categories** — not tied to trips. Created by users when entering expenses. Filter UI uses `SELECT DISTINCT category FROM expenses WHERE trip_id = $1`.
- **"Everyone" split detection** — compare expense_participants count to trip_participants count for that trip. No separate flag column.
- **Users without email** — some trip participants (Lisa, Suming) don't have Google accounts. They have `email = NULL` and cannot log in, but can be referenced as payers/participants.
- **Trip ownership** — `trips.created_by` determines who can edit/delete. No separate role column.
- **`updated_at` trigger** — automatically set on UPDATE via `set_updated_at()` trigger function on users, trips, expenses.
- **Home currency** — always USD, handled in app code. Not stored per-trip.

## Common Query Patterns

### Get all expenses for a trip (with related data)
```sql
SELECT
    e.id, e.name, e.date, e.cost_original, e.currency,
    e.cost_converted_usd, e.exchange_rate, e.conversion_error,
    e.category, e.notes, e.reported_at,
    l.name AS location_name,
    payer.name AS paid_by_name,
    reporter.name AS reported_by_name,
    ARRAY_AGG(DISTINCT participant.name ORDER BY participant.name) AS split_between
FROM expenses e
JOIN users payer ON e.paid_by = payer.id
LEFT JOIN users reporter ON e.reported_by = reporter.id
LEFT JOIN locations l ON e.location_id = l.id
LEFT JOIN expense_participants ep ON ep.expense_id = e.id
LEFT JOIN users participant ON ep.user_id = participant.id
WHERE e.trip_id = $1 AND e.deleted_at IS NULL
GROUP BY e.id, l.name, payer.name, reporter.name
ORDER BY e.date, e.created_at;
```

### Get trip participants
```sql
SELECT u.id, u.name, u.email, u.avatar_url
FROM trip_participants tp
JOIN users u ON tp.user_id = u.id
WHERE tp.trip_id = $1 AND tp.left_at IS NULL
ORDER BY u.name;
```

### Get locations for a trip
```sql
SELECT id, name FROM locations
WHERE trip_id = $1 AND deleted_at IS NULL
ORDER BY name;
```

### Get distinct categories for a trip (for filter UI)
```sql
SELECT DISTINCT category FROM expenses
WHERE trip_id = $1 AND deleted_at IS NULL AND category IS NOT NULL
ORDER BY category;
```

### Look up user by email (Auth.js sign-in)
```sql
SELECT id, name, email, avatar_url FROM users
WHERE email = $1 AND deleted_at IS NULL;
```

## Migration System

- Runner: `scripts/migrate.js`
- Files: `database/migrations/NNNNN_description.sql`
- Tracking: `schema_migrations` table (version + applied_at)
- Commands: `pnpm db:migrate` (local), `DATABASE_URL=<url> node scripts/migrate.js` (prod)
- Create new: `pnpm db:create-migration <description>`
- Reset local: `pnpm db:reset`

## Indexes

| Index | Table | Purpose |
|-------|-------|---------|
| idx_users_deleted_at (partial) | users | Filter active users |
| idx_trips_created_by | trips | Trips by creator |
| idx_trips_deleted_at (partial) | trips | Filter active trips |
| idx_trip_participants_trip_id | trip_participants | Participants per trip |
| idx_trip_participants_user_id | trip_participants | Trips per user |
| idx_locations_trip_id | locations | Locations per trip |
| idx_expenses_trip_id | expenses | Expenses per trip |
| idx_expenses_trip_date | expenses | Expenses by trip + date |
| idx_expenses_paid_by | expenses | Expenses by payer |
| idx_expenses_deleted_at (partial) | expenses | Filter active expenses |
| idx_expenses_category (partial) | expenses | Filter by category |
| idx_expense_participants_expense_id | expense_participants | Participants per expense |
| idx_expense_participants_user_id | expense_participants | Expenses per participant |

## Future Additions (deferred)

- **Receipt images**: Add `receipt_url TEXT` column to expenses
- **Audit log**: `audit_log` table + triggers for edit history tracking
- **Participant roles**: Add `role TEXT` to trip_participants
- **Per-app access control**: New table when non-travel features are added
