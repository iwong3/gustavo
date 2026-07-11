# Phase 5a: Wire Up App to Read from DB

## Goal

Replace the Google Sheets data source with the local Postgres DB. Phased
approach: first build and test API routes independently, then swap the app's
data source, then clean up old code.

---

## Phase 1: API Routes (no app changes)

Build Next.js API routes for reading (and optionally writing) data. Test them
independently with curl or the browser before touching any frontend code.

### Step 1.1 — Move DB pool to `lib/db.ts`

Move the Postgres pool from `backend/db.ts` to the Next.js convention location.

Create `lib/db.ts`:
```typescript
import { Pool } from 'pg'

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: true } : false,
})

export default pool
```

Update `backend/api/health.ts` to import from `@/lib/db` instead of `../db`.
Then delete `backend/db.ts`.

### Step 1.2 — GET `/api/trips`

**File**: `app/api/trips/route.ts`

Returns all active trips with participant names.

```sql
SELECT
    t.id, t.name, t.start_date, t.end_date,
    ARRAY_AGG(DISTINCT split_part(u.name, ' ', 1) ORDER BY split_part(u.name, ' ', 1)) AS participants
FROM trips t
LEFT JOIN trip_participants tp ON tp.trip_id = t.id AND tp.left_at IS NULL
LEFT JOIN users u ON tp.user_id = u.id
WHERE t.deleted_at IS NULL
GROUP BY t.id
ORDER BY t.start_date DESC;
```

Response shape:
```json
[
    {
        "id": 1,
        "name": "Japan 2024",
        "start_date": "2024-11-22",
        "end_date": "2024-12-06",
        "participants": ["Aibek", "Angela", "Ivan", "Jenny", "Joanna", "Lisa", "Michelle", "Suming"]
    }
]
```

### Step 1.3 — GET `/api/trips/[tripId]/expenses`

**File**: `app/api/trips/[tripId]/expenses/route.ts`

Returns all active expenses for a trip with joined data.

```sql
SELECT
    e.id,
    e.name,
    e.date,
    e.cost_original,
    e.currency,
    e.cost_converted_usd,
    e.exchange_rate,
    e.conversion_error,
    e.category,
    e.notes,
    e.reported_at,
    l.name AS location_name,
    payer.name AS paid_by_name,
    reporter.name AS reported_by_name,
    reporter.email AS reported_by_email,
    ARRAY_AGG(DISTINCT split_part(participant.name, ' ', 1) ORDER BY split_part(participant.name, ' ', 1)) AS split_between
FROM expenses e
JOIN users payer ON e.paid_by = payer.id
LEFT JOIN users reporter ON e.reported_by = reporter.id
LEFT JOIN locations l ON e.location_id = l.id
LEFT JOIN expense_participants ep ON ep.expense_id = e.id
LEFT JOIN users participant ON ep.user_id = participant.id
WHERE e.trip_id = $1 AND e.deleted_at IS NULL
GROUP BY e.id, l.name, payer.name, reporter.name, reporter.email
ORDER BY e.date, e.created_at;
```

**"Everyone" detection**: Also query trip participant count:
```sql
SELECT COUNT(*) FROM trip_participants WHERE trip_id = $1 AND left_at IS NULL
```

Add `is_everyone: boolean` to each expense row by comparing
`split_between.length === tripParticipantCount`.

**Important**: `params` is a `Promise` in Next.js 15 — must `await params`
before accessing `tripId`.

Route handler pattern:
```typescript
import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ tripId: string }> }
) {
    const { tripId } = await params
    const id = parseInt(tripId, 10)
    if (isNaN(id)) {
        return NextResponse.json({ error: 'Invalid trip ID' }, { status: 400 })
    }
    // ... query and return
}
```

### Step 1.4 — GET `/api/trips/[tripId]/locations`

**File**: `app/api/trips/[tripId]/locations/route.ts`

```sql
SELECT id, name FROM locations
WHERE trip_id = $1 AND deleted_at IS NULL
ORDER BY name;
```

### Step 1.5 — (Optional) Write endpoints

These are not needed for the verification goal but useful to build now:

- **POST** `/api/trips/[tripId]/expenses` — create a new expense
- **PUT** `/api/expenses/[expenseId]` — update an expense
- **DELETE** `/api/expenses/[expenseId]` — soft-delete an expense

Follow the same pattern. All writes should be in a transaction (expense +
expense_participants together). Soft-delete sets `deleted_at = NOW()`.

### Step 1.6 — Test the API routes

Start the app (`pnpm dev`) and test with curl:

```bash
curl http://localhost:3000/api/trips | jq .
curl http://localhost:3000/api/trips/1/expenses | jq .
curl http://localhost:3000/api/trips/1/locations | jq .
```

Verify:
- Correct number of expenses per trip (177, 41, 103, 195)
- Names, dates, costs match the CSV data
- "Everyone" detection works (check a shared expense vs a personal one)
- Locations include auto-created ones (Nara, Squamish, etc.)

---

## Phase 2: Swap the App's Data Source

With API routes tested, now update the frontend to use them instead of Google
Sheets. **Keep the `Spend` interface unchanged** so all downstream code
(filters, sorts, debt calc, components) keeps working.

### Step 2.1 — Add `getPersonFromFirstName()` helper

**File**: `app/utils/person.ts`

```typescript
export const getPersonFromFirstName = (firstName: string): Person => {
    return Person[firstName as keyof typeof Person] || (firstName as unknown as Person)
}
```

This works because `Person.Ivan = 'Ivan'`, so `Person['Ivan']` returns
`Person.Ivan`. "Suming" (single word) also works since it matches both the
key and value.

### Step 2.2 — Add missing Location enum values

**File**: `app/utils/location.ts`

The DB has locations not in the current `Location` enum. These were auto-created
during CSV backfill. Add them:

```typescript
export enum Location {
    // Japan
    Hakone = 'Hakone',
    Hiroshima = 'Hiroshima',
    Kawaguchiko = 'Kawaguchiko',
    Kyoto = 'Kyoto',
    Miyajima = 'Miyajima',          // NEW — Japan 2025
    Nara = 'Nara',                  // NEW — Japan 2024
    Osaka = 'Osaka',
    Tokyo = 'Tokyo',
    Uji = 'Uji',
    // Vancouver
    Squamish = 'Squamish',          // NEW — Vancouver 2024
    Vancouver = 'Vancouver',
    // South Korea
    SanFrancisco = 'San Francisco', // NEW — en route (South Korea 2025)
    Seoul = 'Seoul',
    // Other
    Other = 'Other',
}
```

Update `LocationByTrip` to include new values for each trip.
Update `getLocationAbbr()` with abbreviations for new locations (e.g.,
`MI`, `NA`, `SQ`, `SF`).

### Step 2.3 — Replace `fetchData()` in `data-mapping.ts`

This is the core swap. Currently `fetchData(trip)` fetches a Google Sheet CSV
and returns `[Spend[], boolean]`.

**New implementation:**

1. Add a `Trip` → trip ID mapping:

```typescript
const TripToId: Record<Trip, number> = {
    [Trip.Japan2024]: 1,
    [Trip.Vancouver2024]: 2,
    [Trip.SouthKorea2025]: 3,
    [Trip.Japan2025]: 4,
}
```

2. Fetch from the API route:

```typescript
const res = await fetch(`/api/trips/${TripToId[trip]}/expenses`)
const rows = await res.json()
```

3. Map each row to the existing `Spend` interface:

```typescript
const data: Spend[] = rows.map((row) => {
    const paidByFirstName = row.paid_by_name.split(' ')[0]
    const paidBy = getPersonFromFirstName(paidByFirstName)

    let splitBetween: Person[]
    if (row.is_everyone) {
        splitBetween = [Person.Everyone]
    } else {
        splitBetween = row.split_between
            .filter(Boolean)
            .map((name: string) => getPersonFromFirstName(name))
            .filter(Boolean)
    }

    return {
        trip,
        name: row.name,
        date: formatDateForApp(row.date),
        originalCost: parseFloat(row.cost_original),
        currency: row.currency as Currency,
        convertedCost: parseFloat(row.cost_converted_usd),
        paidBy,
        splitBetween,
        location: row.location_name as Location | undefined,
        type: row.category as SpendType | undefined,
        notes: row.notes || '',
        reportedBy: row.reported_by_email
            ? getPersonFromEmail(row.reported_by_email.trim())
            : undefined,
        reportedAt: row.reported_at || undefined,
        receiptImageUrl: undefined,  // not stored in DB yet
        error: row.conversion_error || false,
    }
})
```

4. **Date formatting**: The DB returns ISO dates (`2024-11-22`). The app and
   all downstream code (filters, display, sorting) expects `M/D/YYYY`.

```typescript
function formatDateForApp(isoDate: string): string {
    const d = new Date(isoDate + 'T00:00:00')  // prevent timezone shift
    return `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`
}
```

5. Return value: Keep `Promise<[Spend[], boolean]>`. Set the second value to
   `data.some(s => s.error)`.

**What to keep in `data-mapping.ts` for now**: Leave the old Google Sheets code
commented out (don't delete yet). It's useful as a fallback reference until
verification is complete.

**What can be removed**: The `axios` import, the `parseRow()` function, and
the `Columns` enum are no longer called — but leave them commented out for now.

### Step 2.4 — Verify

1. `pnpm docker:up` — ensure DB is running with backfilled data
2. `pnpm dev` — start the app
3. Open the app, select each trip, and verify:
   - Expense list renders correctly (names, dates, costs, locations)
   - Filters work (by person, by type, by location, by split between)
   - Sort works (by date, by cost, by name)
   - Search works (fuzzy search on name, location, etc.)
   - Debt calculator shows correct amounts for any two people
   - Summary views: total spend, by person, by type, by location, by date
4. Compare a few expenses against the Google Sheets CSV to spot-check

### Known differences to expect

- New locations (Nara, Squamish, etc.) appear in the location filter — correct
- Receipt image URLs are `undefined` — no `receipt_url` column yet
- The Japan 2024 date typo (`11/24/0024`) was already fixed during backfill

---

## Phase 3: Cleanup (separate task, do after verification)

Once the app is verified working with DB data:

1. **Remove old Google Sheets code**: Delete `UrlsByTrip`, `CsvPath`, `ViewPath`,
   `Columns` enum, `parseRow()`, and the `axios` import from `data-mapping.ts`
2. **Remove `axios` dependency** if nothing else uses it
3. **Evaluate Zustand stores**:
   - Keep: filter stores, sort stores, search store, UI menu stores (these are
     legit client-side state)
   - Replace `useGustavoStore` (god-store) with `useState` + `useMemo` for
     derived values. Or use TanStack Query/SWR for data fetching with built-in
     caching
   - Replace `useTripsStore` — the `fetchData` call moves to a simpler pattern
4. **Remove `backend/` folder** entirely:
   - Move health endpoint logic inline to `app/api/health/route.ts`
   - Delete `backend/api/`, `backend/types/`, `backend/utils/`
5. **Make enums dynamic** (optional, longer-term): Replace hardcoded `Person`,
   `Location`, `Trip` enums with data from the DB. This removes the need to
   update TypeScript code when adding new trips or people.

---

## Files to read before implementing

| File | Why |
|------|-----|
| `app/utils/data-mapping.ts` | The function you're replacing (`fetchData`) |
| `app/utils/spend.ts` | The `Spend` interface and `SpendType` enum |
| `app/utils/person.ts` | `Person` enum, `PeopleByTrip`, `getPersonFromEmail` |
| `app/utils/location.ts` | `Location` enum, `LocationByTrip`, `getLocationAbbr` |
| `app/utils/currency.ts` | `Currency` enum |
| `app/views/trips.tsx` | Where `fetchData` is called (`initializeCurrentTripData`) |
| `backend/db.ts` | Pool to move to `lib/db.ts` |
| `backend/api/health.ts` | Existing API route pattern |
| `.claude/docs/schema.md` | DB schema and query patterns |

## What NOT to change (Phase 1 and 2)

- Zustand stores (any of them)
- Filter/sort/search pipeline in `menu.tsx`
- Debt calculation logic (`data-processing.ts`)
- Component rendering (`receipts-list.tsx`, `summary/`, `debt-calculator.tsx`)
- The `Spend` interface
- Auth flow

---

## Model recommendation

**Claude Sonnet 4.6** — well-scoped task with clear file-by-file instructions.
Start with Phase 1 (API routes only), verify they work, then proceed to
Phase 2 (swap data source).
