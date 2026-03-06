# App Code Guide: Understanding the Codebase

This document walks through how the code is organized and how everything
connects. It's meant to help you read the source files with context.

---

## Next.js App Router — the Mental Model

This app uses the **App Router** (the `app/` directory), not the old Pages
Router (`pages/`). Here's what you need to know:

### File = Route

The filesystem maps directly to URLs:

- `app/page.tsx` → `/`
- `app/login/page.tsx` → `/login`
- `app/gustavo/page.tsx` → `/gustavo`
- `app/gustavo/expenses/trips/[slug]/page.tsx` →
  `/gustavo/expenses/trips/japan-2024`

`[slug]` is a **dynamic segment** — the value is available in the component via
`useParams()` (client) or the `params` prop (server).

### layout.tsx — Wraps Children

A `layout.tsx` wraps all pages under its directory and persists across
navigations:

- `app/layout.tsx` → wraps the entire app (HTML shell, providers)
- `app/gustavo/layout.tsx` → wraps all `/gustavo/*` pages (header + tab bar)

Layout files do NOT remount when navigating between child pages.

### Server vs Client Components

By default, files in `app/` are **Server Components** — they run on the server,
can access databases and env vars directly, but cannot use React state or
browser APIs.

Add `'use client'` at the top of a file to make it a **Client Component** — it
runs in the browser (and also SSR'd on first load), can use `useState`,
`useEffect`, `useContext`, Zustand, etc.

**This app uses `'use client'` on almost everything** because it's a PWA with
lots of interactive state. The only Server Component pattern used is API routes
(which are neither — they're just request handlers).

### API Routes (Route Handlers)

Files named `route.ts` inside `app/api/` are HTTP endpoint handlers:

```typescript
// app/api/trips/route.ts
export async function GET(request: NextRequest) { ... }
export async function POST(request: NextRequest) { ... }
```

These run on the server only. They import from `lib/db.ts` to query Postgres.
They don't import any React or client-side code.

Dynamic route params in API routes (e.g. `[tripId]`) come through as a
**Promise** in Next.js 15 and must be awaited:

```typescript
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ tripId: string }> }
) {
    const { tripId } = await params // must await
}
```

---

## Data Flow: From Database to Screen

Here's the complete path data takes:

```
Postgres (Neon)
  → API route (app/api/...)        runs on server, queries DB
  → fetch() in utils/api.ts        runs in browser, calls the API
  → useState in page component     holds raw data
  → TripDataProvider (Context)     broadcasts to all children
  → useSpendData() (spend-data-provider)  derives filtered/sorted/computed data
  → Display components             render the result
```

Let's trace the trip detail page specifically:

### 1. User navigates to `/gustavo/expenses/trips/japan-2024`

Next.js renders `app/gustavo/expenses/trips/[slug]/page.tsx`.

### 2. Page fetches data

```typescript
const tripData = await fetchTripBySlug(slug) // GET /api/trips?slug=japan-2024
const expensesData = await fetchExpenses(tripData.id) // GET /api/trips/5/expenses
```

Both calls go through `app/utils/api.ts` — a thin wrapper that handles `fetch`,
throws on non-OK status, and returns typed JSON.

### 3. API routes query Postgres

`app/api/trips/route.ts` receives `GET /api/trips?slug=japan-2024`, runs a JOIN
query on `trips` + `trip_participants` + `users`, and returns JSON matching the
`TripSummary` type.

`app/api/trips/[tripId]/expenses/route.ts` runs a larger JOIN across `expenses`,
`expense_participants`, `users`, `locations`, and `expense_categories`.

### 4. Data stored in React state

```typescript
const [trip, setTrip] = useState<TripSummary | null>(null)
const [expenses, setExpenses] = useState<Expense[]>([])
// ... after fetch:
setTrip(tripData)
setExpenses(expensesData)
```

### 5. TripDataProvider broadcasts via Context

```typescript
// app/providers/trip-data-provider.tsx
<TripDataContext.Provider value={{ expenses, trip }}>
    {children}
</TripDataContext.Provider>
```

Any component inside can call `useTripData()` to get the current trip and its
raw expenses. This is React Context — standard React, no Zustand.

### 6. useSpendData() derives everything

`app/providers/spend-data-provider.tsx` exports `useSpendData()`. This hook:

- Reads raw expenses from `useTripData()`
- Reads filter/sort/search state from Zustand stores
- Uses `useMemo` to derive filtered expenses, totals, debt map, etc.
- Returns a big object all display components can use

This is **pure computation** — it doesn't fetch, mutate, or store anything.
Every time a filter changes in Zustand, this recalculates automatically.

---

## State Management Architecture

The app uses two kinds of state for different purposes:

### React Context (for trip data)

`TripDataProvider` holds the raw `trip` and `expenses` arrays. This is the
**source of truth for data**. When the user adds an expense, the page calls
`refreshData()` which re-fetches from the API and calls `setExpenses(newData)`,
which flows down through Context.

### Zustand (for UI state only)

Every interactive filter, sort, and setting has its own small Zustand store:

- `useFilterPaidByStore` — which payers are selected
- `useFilterSplitBetweenStore` — which participants are selected
- `useFilterSpendTypeStore` — which categories are selected
- `useFilterLocationStore` — which locations are selected
- `useSortCostStore`, `useSortDateStore`, `useSortItemNameStore`
- `useSearchBarStore` — current search text
- `useSettingsIconLabelsStore` — whether to show labels on menu icons
- `useToolsMenuStore` — which "tool" tab is active (receipts/summary/graph/debt)
- `useSummaryStore` — which summary sub-view is active
- `useTripsStore` — loading/error state for the trips page

These stores hold **display preferences, not data**. They don't know about trips
or expenses directly.

### Why this split?

The data (expenses) needs to cause a full re-render cascade when it changes (a
new expense appears in the list, totals update, etc.). React Context with
`useState` does this reliably and deterministically.

UI state (filters, sort) changes one thing at a time from user actions. Zustand
is simpler for this — no prop drilling, directly accessible anywhere.

### The key rule: no store.get() in computations

`useSpendData()` computes filtered expenses using `useMemo`. The memo reads:

- `expenses` from Context (React snapshot)
- filter/sort values directly from Zustand hooks (also snapshots)

It never calls `someStore.getState()` inside a memo — that would break React's
dependency tracking and cause stale values.

---

## Zustand Store Pattern

Every Zustand store follows the same pattern:

```typescript
// Define state shape
type FilterState = {
    filters: Map<string, boolean>
}

// Define actions
type FilterActions = {
    reset: (names: string[]) => void
    toggle: (name: string) => void
}

// Create store
export const useFilterPaidByStore = create<FilterState & FilterActions>(
    (set) => ({
        filters: new Map(),
        reset: (names) =>
            set({ filters: new Map(names.map((n) => [n, false])) }),
        toggle: (name) =>
            set((s) => {
                const next = new Map(s.filters)
                next.set(name, !next.get(name))
                return { filters: next }
            }),
    })
)
```

**Reading in a component:**

```typescript
const filters = useFilterPaidByStore((s) => s.filters)
const toggle = useFilterPaidByStore((s) => s.toggle)
```

Always select the minimal slice you need. For multiple values at once, use
`useShallow`:

```typescript
const { loading, fetchDataError } = useTripsStore(useShallow((s) => s))
```

`useShallow` prevents re-renders when an unrelated part of the store changes.

---

## The Menu System (Trip Detail View)

The menu bar at the bottom of the trip detail page has two layers:

**Bottom tab bar** (in `app/gustavo/layout.tsx`) — persistent across all
`/gustavo/*` pages: Home | Expenses | Settings

**Filter/sort menu bar** (in `app/components/menu/menu.tsx`) — visible only on
trip detail pages, sits just above the bottom tab bar. Contains:

- Reset (clears all filters/sorts)
- Sort (cost / date / name)
- Filter: Person (split between), Paid By, Type (category), Location
- Settings (icon label toggle, receipt submission link)

Clicking a menu icon **expands a panel above it** with the filter options.
`expandedMenuItem` state in `menu.tsx` controls which panel is open.

**ToolsMenu** (in the header, top right) — switches the main content area
between: Receipts | Summary | Graph | Debt Calculator | Links. This is
controlled by `useToolsMenuStore`.

The active view's component renders via:

```typescript
const ActiveComponent = ToolsMenuItemMap.get(activeItem)?.Component ?? null
// ...
{ActiveComponent && <ActiveComponent />}
```

---

## API Routes — Pattern Walkthrough

Every API route file follows this pattern:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'          // Auth.js session check
import pool from '@/lib/db'           // Postgres connection pool
import { withAuditUser } from '@/lib/db-audit'  // (for writes)

export async function GET(request: NextRequest) {
    // 1. (Optional) check auth for sensitive reads
    // 2. Query the DB
    const result = await pool.query('SELECT ...', [params])
    // 3. Return JSON
    return NextResponse.json(result.rows)
}

export async function POST(request: NextRequest) {
    // 1. Check auth — required for all writes
    const session = await auth()
    if (!session?.user?.email) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    // 2. Parse body
    const body = await request.json()
    // 3. Validate
    if (!body.name) return NextResponse.json({ error: 'Missing name' }, { status: 400 })
    // 4. Write to DB (wrapped in audit transaction)
    await withAuditUser(userId, async (client) => {
        await client.query('INSERT INTO ...', [...])
    })
    // 5. Return result
    return NextResponse.json({ id: newId }, { status: 201 })
}
```

**auth()** — Auth.js function that reads the session from the request cookie.
Returns `null` if not logged in. Used to gate all write operations.

**pool.query()** — Parameterized query. Always use `$1, $2, ...` placeholders,
never string interpolation. The pool is shared across all requests in the same
Node.js process.

**withAuditUser()** — Wraps a function in a DB transaction. Before running, it
sets `SET LOCAL audit.changed_by = userId`. The audit trigger on each table
reads this and records who made the change in `audit_log`.

---

## Database Layer

### lib/db.ts

Creates one `pg.Pool` using `DATABASE_URL`. The pool manages a connection pool
internally. Import `pool` from here wherever you need DB access.

```typescript
import pool from '@/lib/db'
const result = await pool.query('SELECT * FROM trips WHERE id = $1', [id])
// result.rows is an array of plain objects
```

### Soft Deletes

All tables (users, trips, expenses, locations) have a `deleted_at` column.
Records are never hard-deleted — they're marked with a timestamp instead.

**Every query must filter `WHERE deleted_at IS NULL`** or it will return deleted
records.

### "Everyone" Detection

The DB doesn't store a boolean flag for "split between everyone". Instead, when
an expense's `expense_participants` count equals the trip's `trip_participants`
count, the API sets `isEveryone: true` on the returned expense object.

### Audit Log

`audit_log` table captures every INSERT/UPDATE/DELETE with: table name, row ID,
operation, old/new values (JSONB), who changed it, and when. Filled by Postgres
triggers — nothing in application code needs to write to it directly. The
`withAuditUser()` function sets the `audit.changed_by` session variable so the
trigger knows the user.

---

## Middleware (Auth Guard)

`middleware.ts`:

```typescript
export { auth as middleware } from '@/auth'

export const config = {
    matcher: ['/((?!api/auth|login|_next/static|...).*)'],
}
```

This re-exports the Auth.js middleware, which runs before every matched request.
The `matcher` pattern says: run on everything EXCEPT:

- `/api/auth/*` — Auth.js endpoints themselves
- `/login` — the login page
- Next.js static assets, images, PWA files

If no valid session, Auth.js redirects to `/login`.

---

## Refresh Pattern

When the user adds, edits, or deletes an expense, the expense list needs to
update without a full page reload.

The pattern:

1. `[slug]/page.tsx` defines `refreshData()` — re-fetches expenses and calls
   `setExpenses()`
2. Passes it to `<Gustavo onRefresh={refreshData} />`
3. `Gustavo` wraps children in `<RefreshProvider onRefresh={...} />`
4. Deep components (e.g. `ExpenseFormDialog`, delete buttons) call
   `useRefresh().onRefresh()`

`RefreshProvider` is just a React Context that threads the callback down without
prop drilling through every intermediate component.

---

## PWA (Progressive Web App)

`next.config.mjs` wraps the Next.js config with `next-pwa` in production. This
generates a Workbox service worker (`public/sw.js`) that:

- Caches static assets (JS, CSS, images, fonts)
- Falls back to the `/offline` page when the network is unavailable
- Uses `NetworkFirst` for API calls (tries network, falls back to cache)

`app/layout.tsx` sets all the PWA meta tags:

- `manifest.json` — app name, icons, display mode, theme color
- Apple-specific tags for iOS home screen install
- `viewportFit: 'cover'` — draws behind iPhone notch and home indicator

`usePWAInstall` hook captures the browser's `beforeinstallprompt` event so the
app can show a custom install button instead of the browser's default banner.

---

## TypeScript Path Aliases

`tsconfig.json` sets up path aliases so imports don't need relative paths:

```typescript
// Instead of: import { fetchTrips } from '../../utils/api'
import { fetchTrips } from 'utils/api'

// The @/ prefix maps to the repo root:
import type { TripSummary } from '@/lib/types'
import pool from '@/lib/db'
```

Configured in `tsconfig.json` under `compilerOptions.paths`.

---

## MUI (Material UI) v7

The app uses MUI v7 for UI components. Key things to know:

**`sx` prop** — Instead of CSS classes, MUI components accept an `sx` prop with
a CSS-in-JS object. Supports responsive breakpoints, theme tokens, and
pseudo-selectors:

```tsx
<Box sx={{ display: 'flex', gap: 2, '&:hover': { backgroundColor: '#eee' } }}>
```

**`Box`** — A generic `div`-like component. Takes any HTML element type via
`component` prop:

```tsx
<Box component={Link} href="/gustavo" sx={{ textDecoration: 'none' }}>
```

**`AppRouterCacheProvider`** — In `app/layout.tsx`, this wrapper from
`@mui/material-nextjs` ensures MUI's CSS-in-JS works correctly with Next.js App
Router's caching (avoids style flicker on first load).

**`Grid`** — MUI v7 renamed `Grid2` back to `Grid`. Use `<Grid>` not `<Grid2>`.

---

## File Naming Conventions

- `page.tsx` — Next.js page (URL endpoint)
- `layout.tsx` — Next.js layout (persistent wrapper)
- `route.ts` — Next.js API route handler
- `kebab-case.tsx` — Components (e.g. `expense-form-dialog.tsx`)
- `camelCase.ts` — Utilities (e.g. `dataMapping.ts`)
- Views in `app/views/` export a component AND a Zustand store (e.g. `trips.tsx`
  exports both `<TripsView>` concept and `useTripsStore`)

---

## Key Files to Read First

If you want to understand the codebase by reading files, this order makes sense:

1. [lib/types.ts](../../lib/types.ts) — All the data shapes. Read this first.
2. [lib/db.ts](../../lib/db.ts) — 8 lines. The DB connection.
3. [app/auth.ts](../../app/auth.ts) — Auth config + email allowlist.
4. [middleware.ts](../../middleware.ts) — 1-line auth guard.
5. [app/utils/api.ts](../../app/utils/api.ts) — Every fetch() call in one file.
6. [app/api/trips/route.ts](../../app/api/trips/route.ts) — Typical API route:
   GET + POST.
7. [app/providers/trip-data-provider.tsx](../../app/providers/trip-data-provider.tsx)
   — Simple Context wrapper.
8. [app/providers/spend-data-provider.tsx](../../app/providers/spend-data-provider.tsx)
   — All the filter/sort/compute logic.
9. [app/gustavo/expenses/trips/[slug]/page.tsx](../../app/gustavo/expenses/trips/%5Bslug%5D/page.tsx)
   — The main page: fetch + wire up providers.
10. [app/views/gustavo.tsx](../../app/views/gustavo.tsx) — The main UI shell
    (swipe, FAB, menu).
11. [app/gustavo/layout.tsx](../../app/gustavo/layout.tsx) — Header + bottom tab
    bar.
12. [app/components/menu/menu.tsx](../../app/components/menu/menu.tsx) — The
    filter/sort menu bar.

---

## Common Patterns You'll Encounter

### Fetching on mount

```typescript
useEffect(() => {
    let ignore = false
    async function load() {
        const data = await fetchSomething()
        if (!ignore) setData(data)
    }
    load()
    return () => {
        ignore = true
    } // cleanup: prevents setting state after unmount
}, [dependency])
```

### Error handling in API routes

```typescript
try {
    const result = await withAuditUser(userId, async (client) => {
        // ...queries...
    })
    return NextResponse.json(result, { status: 201 })
} catch (err) {
    console.error('Error:', err)
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
}
```

### Zustand with useShallow (multiple values)

```typescript
// DON'T do this — creates new object every render, infinite re-render loop:
const { a, b } = useStore((s) => ({ a: s.a, b: s.b }))

// DO this:
const { a, b } = useStore(useShallow((s) => ({ a: s.a, b: s.b })))
// or just select separately:
const a = useStore((s) => s.a)
const b = useStore((s) => s.b)
```

### Calling API routes from components

Always go through `app/utils/api.ts` — don't call `fetch()` directly in
components. `api.ts` throws on error, which components can catch and handle.

### 'use client' placement

The `'use client'` directive must be at the very top of the file, before any
imports. It marks the entire file and all its transitive imports as client-side.
If you import a server-only module (like `lib/db.ts`) from a client component,
you'll get a build error.
