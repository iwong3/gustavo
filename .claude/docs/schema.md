# Database Schema

## ER Diagram

```
users
  id BIGINT PK
  email TEXT (unique, nullable)
  name TEXT
  first_name TEXT
  initials TEXT
  avatar_url TEXT
  venmo_url TEXT
  is_admin BOOLEAN (default false)
  default_trip_visibility TEXT (default 'participants')
  default_participant_role TEXT (default 'viewer')
  created_at, updated_at, deleted_at

trips
  id BIGINT PK
  name TEXT
  slug TEXT (unique)
  description TEXT
  start_date DATE
  end_date DATE
  visibility TEXT (default 'participants')
  created_by BIGINT FK -> users
  created_at, updated_at, deleted_at

trip_participants
  id BIGINT PK
  trip_id BIGINT FK -> trips
  user_id BIGINT FK -> users
  role TEXT (default 'viewer') -- 'owner' | 'editor' | 'viewer'
  joined_at TIMESTAMPTZ
  left_at TIMESTAMPTZ
  UNIQUE(trip_id, user_id)

locations
  id BIGINT PK
  trip_id BIGINT FK -> trips
  name TEXT
  created_at, deleted_at
  UNIQUE(trip_id, name)

expense_categories
  id BIGINT PK
  name TEXT (unique)
  created_by BIGINT FK -> users
  created_at, updated_at, deleted_at

expenses
  id BIGINT PK
  trip_id BIGINT FK -> trips
  name TEXT
  date DATE
  cost_original NUMERIC(12,2)
  currency TEXT
  cost_converted_usd NUMERIC(12,2)
  exchange_rate NUMERIC(16,8)
  conversion_error BOOLEAN
  category_id BIGINT FK -> expense_categories
  location_id BIGINT FK -> locations
  paid_by BIGINT FK -> users
  notes TEXT
  reported_by BIGINT FK -> users
  reported_at TIMESTAMPTZ
  created_at, updated_at, deleted_at

expense_participants
  id BIGINT PK
  expense_id BIGINT FK -> expenses (CASCADE)
  user_id BIGINT FK -> users
  UNIQUE(expense_id, user_id)

audit_log
  id BIGINT PK
  table_name TEXT
  row_id BIGINT
  action TEXT ('INSERT' | 'UPDATE' | 'DELETE')
  old_data JSONB
  new_data JSONB
  changed_by BIGINT
  changed_at TIMESTAMPTZ
```

## Relationships

```
users 1──* trips (created_by)
users 1──* trip_participants
trips 1──* trip_participants
trips 1──* locations
trips 1──* expenses
users 1──* expenses (paid_by)
users 1──* expenses (reported_by)
expense_categories 1──* expenses (category_id)
users 1──* expense_categories (created_by)
locations 1──* expenses
expenses 1──* expense_participants
users 1──* expense_participants
```

## Permissions Model

### Trip roles
- **owner** — exactly one per trip (the creator). Can edit trip, manage participants/roles, delete trip.
- **editor** — can add/edit/delete any expense, manage locations.
- **viewer** — can add expenses and edit/delete only their own (where `reported_by = current user`).

### Trip visibility
- **participants** (default) — only trip participants can see the trip.
- **all_users** — any authenticated user can see (but not edit) the trip.

### Admin flag
- `users.is_admin = true` bypasses ALL permission checks (short-circuit in every `can*` function).

### Permission functions (lib/permissions.ts, app/utils/permissions.ts)
| Function | Access granted to |
|----------|-------------------|
| `canEditTrip` | admin, owner, editor |
| `canDeleteTrip` | admin, owner |
| `canAddExpense` | owner, editor, viewer (any participant) |
| `canEditExpense` | admin, owner, editor, or reporter |
| `canDeleteExpense` | same as canEditExpense |
| `canManageRoles` | admin, owner |
| `canManageLocations` | admin, owner, editor |
| `canEditCategory` | admin, or category creator |
| `canDeleteCategory` | admin, or category creator |

### User default preferences
- `default_trip_visibility` — applied when creating a new trip.
- `default_participant_role` — applied when adding participants to trips the user creates.

## Key Design Decisions

- **BIGINT PKs** — simpler and more efficient than UUID for a single-DB personal app
- **TEXT for role/visibility/currency** — no Postgres ENUMs (can't remove values). Validated in app code.
- **Soft deletes** — `deleted_at TIMESTAMPTZ` on users, trips, locations, expenses, expense_categories. All queries filter `WHERE deleted_at IS NULL`.
- **Expense categories** — global (not trip-scoped), with `created_by` for ownership. Soft-deleted categories still display on existing expenses and remain filterable.
- **"Everyone" split detection** — compare expense_participants count to trip_participants count for that trip. No separate flag column.
- **Users without email** — some participants don't have Google accounts. They have `email = NULL` and cannot log in, but can be referenced as payers/participants.
- **Trip ownership** — `trips.created_by` determines the owner. The owner is also recorded as a participant with `role = 'owner'`.
- **`updated_at` trigger** — automatically set on UPDATE via `set_updated_at()` trigger function on users, trips, expenses.
- **Home currency** — always USD, handled in app code. Not stored per-trip.
- **Audit log** — Postgres triggers on all tables automatically write to `audit_log`. User attribution via `SET LOCAL audit.changed_by` in transactions (see `lib/db-audit.ts`).

## Common Query Patterns

### Get all expenses for a trip (with related data)
```sql
SELECT
    e.id, e.name, e.date, e.cost_original, e.currency,
    e.cost_converted_usd, e.exchange_rate, e.conversion_error,
    ec.name AS category_name, e.notes, e.reported_at,
    l.name AS location_name,
    payer.name AS paid_by_name,
    reporter.name AS reported_by_name,
    ARRAY_AGG(DISTINCT participant.name ORDER BY participant.name) AS split_between
FROM expenses e
JOIN users payer ON e.paid_by = payer.id
LEFT JOIN users reporter ON e.reported_by = reporter.id
LEFT JOIN expense_categories ec ON e.category_id = ec.id
LEFT JOIN locations l ON e.location_id = l.id
LEFT JOIN expense_participants ep ON ep.expense_id = e.id
LEFT JOIN users participant ON ep.user_id = participant.id
WHERE e.trip_id = $1 AND e.deleted_at IS NULL
GROUP BY e.id, ec.name, l.name, payer.name, reporter.name
ORDER BY e.date, e.created_at;
```

### Get trip participants with roles
```sql
SELECT u.id, u.name, u.first_name, u.initials, u.email, u.avatar_url, tp.role
FROM trip_participants tp
JOIN users u ON tp.user_id = u.id
WHERE tp.trip_id = $1 AND tp.left_at IS NULL
ORDER BY u.name;
```

### Get trips visible to a user
```sql
SELECT t.* FROM trips t
LEFT JOIN trip_participants tp ON tp.trip_id = t.id AND tp.user_id = $1
WHERE t.deleted_at IS NULL
  AND (tp.user_id IS NOT NULL OR t.visibility = 'all_users')
ORDER BY t.start_date DESC;
```

### Get locations for a trip
```sql
SELECT id, name FROM locations
WHERE trip_id = $1 AND deleted_at IS NULL
ORDER BY name;
```

### Get expense categories (with usage count and edit permission)
```sql
SELECT ec.id, ec.name, ec.created_by,
       COUNT(e.id)::int AS usage_count
FROM expense_categories ec
LEFT JOIN expenses e ON e.category_id = ec.id AND e.deleted_at IS NULL
WHERE ec.deleted_at IS NULL
GROUP BY ec.id, ec.name, ec.created_by
ORDER BY ec.name;
```

### Look up user by email (Auth.js sign-in)
```sql
SELECT id, name, email, avatar_url, is_admin FROM users
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
| idx_trip_participants_role | trip_participants | Participants by trip + role |
| idx_locations_trip_id | locations | Locations per trip |
| idx_expenses_trip_id | expenses | Expenses per trip |
| idx_expenses_trip_date | expenses | Expenses by trip + date |
| idx_expenses_paid_by | expenses | Expenses by payer |
| idx_expenses_deleted_at (partial) | expenses | Filter active expenses |
| idx_expenses_category (partial) | expenses | Filter by category |
| idx_expense_participants_expense_id | expense_participants | Participants per expense |
| idx_expense_participants_user_id | expense_participants | Expenses per participant |
