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

## Navigation Chrome

- **Bottom tab bar** (`BottomTabBar` in `app/gustavo/layout.tsx`): Home |
  Trips | Health | Settings. Leaf pages swap it for a `PageActionBar`
  (Cancel | Save, Delete | Edit …). Re-tapping the active tab scrolls to top.
- **Header top-left** (`HeaderCornerButton`): empty on Home, Gus on tab roots
  (tap → Home), ← everywhere deeper. Its target is `getBackHref()` in
  `utils/back-href.ts` — add a rule there for new routes.
- **Trip header** (`components/trip-header-controls.tsx`): the trip name
  (tap → trip details) and the tool pill, a dropdown of the trip's pages
  (`lib/trip-tools.ts`: Expenses, Debts, Graphs, Links, Activity, Details) —
  each tool is its own route under `trips/[slug]/`.
- **Expenses toolbar** (`components/menu/trip-toolbar.tsx`): search + the
  refine button, which swaps the list for `RefinePanel` (sort + filters;
  state in `refine-store.ts` / `filter-stores.ts` / `sort-store.ts`).

There is no nav drawer — tabs + the header corner are the whole navigation.

- **Page title rows**: every tool/list page starts its content with
  `PageTitleRow` (`components/page-title-row.tsx`) — bold 16px title left;
  toggles/actions then the `PageInfo` ⓘ on the right, 30px controls. Section
  headings inside a page are the 11px uppercase brown label (see debts,
  links, settings).

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

## Loading, Caching & Refresh

All server data goes through React Query (`providers/query-provider.tsx`),
persisted to IndexedDB, so revisits and cold opens render from cache. Rules:

- **Gate on `isPending`, never `isLoading`.** While the persisted cache is
  restoring, queries are pending but *not fetching*, so `isLoading` is false
  with no data — pages flash their empty state ("No workouts yet") instead of
  a skeleton. (Exception: a query that can be disabled stays pending forever —
  guard it with the same condition as its `enabled`.)
- **Gate on only what the page renders** (e.g. `useWorkoutData().pending`),
  not every query a shared hook runs.
- **Skeletons mirror the loaded page** — build them from
  `components/skeleton/bones.tsx` (`TextBone` reserves a text line box,
  `ChromeBox` draws always-present controls), copying paddings/gaps from the
  real components. Page skeletons live in `components/skeleton/`
  (`trip-skeletons.tsx`, `health-skeletons.tsx`, `form-skeleton.tsx`).
- **One skeleton per page, used twice**: by the route's `loading.tsx` *and* the
  page's own loading state (`HealthPageLayout skeleton=`, the trip layout
  gate), so a slow load never swaps one placeholder for another. A folder's
  `loading.tsx` also covers its nested routes, so area-level ones pick the
  skeleton from the URL (`TripsRouteSkeleton`, `HealthRouteSkeleton`) —
  add your route there.
- **Saves seed the cache before navigating back.** APIs return the saved
  record in list shape (expenses: `lib/expense-rows.ts`; workouts: POST/PUT
  bodies) and the form writes it into the cached list (`setQueryData`, see
  `utils/workout-cache.ts`); a background refetch then reconciles. When
  seeding isn't possible, await an explicit `refetchQueries` while the form
  shows "Saving…" (off-screen lists don't refetch on `invalidateQueries`).
- **Deletes remove the row immediately** (`utils/expense-cache.ts`,
  `removeCachedWorkout`) and restore it if the request fails. A detail page
  deleting itself keeps rendering its last copy while it navigates away.
- **Warm the next screen**: `PrefetchOnVisible` on every `router.push` tap
  target (its `onVisible` can `prefetchQuery` the destination's data too —
  the trips list warms each visible trip's expenses/settlements);
  `router.prefetch` for action-bar destinations (edit, duplicate).
- **Refresh**: inside a trip, `useRefresh().onRefresh()` invalidates the
  trip's `queryKeys.trips.detail(id)` subtree (expenses, settlements,
  activity, …) — put new per-trip queries under that key.

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

## Page-style Forms (add / edit)

Every add/edit form in the app is a **page at its own route**, not a drawer or
dialog. The reference implementation is the expense form
(`components/expense-form.tsx`, rendered by
`app/gustavo/trips/[slug]/expenses/new/page.tsx` and `.../[id]/edit/page.tsx`).
Follow it exactly when adding or migrating a form.

### Why pages, not drawers

- The URL is the state: back button, refresh, and deep links all work.
- The bottom tab bar becomes the form's action bar (Cancel | Save) — no
  footer inside a scrolling panel, no `position: fixed` inside `#main-scroll`.
- Keyboard handling (`useScrollFocusedInput`) only has one scroller to reason
  about.

### The three pieces

1. **Route** — `<list>/new/page.tsx` and `<list>/[id]/edit/page.tsx`. The
   page owns navigation and permission/not-found messages:
   ```tsx
   <Box sx={{ display: 'flex', flexDirection: 'column', width: '100%', maxWidth: 450 }}>
       <ThingForm
           mode="edit"
           thing={thing}
           onCancel={() => exitTo(backUrl)}
           onSuccess={() => exitTo(backUrl)}
       />
   </Box>
   ```
   Exit with `exitTo` from `useExitTo()` (`hooks/use-exit-to.ts`), never
   `push` or a bare `router.replace`: it pops history when `backUrl` is the page
   we came from (else replaces), so the form never sits in history AND no
   duplicate of `backUrl` is left behind — a bare replace turns
   `[list, detail, edit]` into `[list, detail, detail]`, and native swipe-back
   lands on the same screen. Same for delete-then-leave on detail pages.
   Variants (duplicate, prefill) are query params on `new`
   (e.g. `/health/exercise/new?from=<id>`). The list page prefetches the
   `new` route on mount so the FAB opens it instantly.

2. **Form component** — `components/<area>/<thing>-form.tsx`. Owns state and
   the request (fetch + React Query invalidation), and renders through
   `FormPage` (`components/form-page.tsx`):
   ```tsx
   <FormPage
       title={isEdit ? 'Edit Thing' : 'Add Thing'}
       error={error}
       onCancel={onCancel}
       onSubmit={handleSubmit}
       busy={submitting}
       submitLabel={submitting ? 'Saving...' : isEdit ? 'Save' : 'Add'}>
       {/* fields */}
   </FormPage>
   ```
   `FormPage` gives you the title row (optional `titleExtra` for a
   `PageInfo` ⓘ), the fields column (gap 2, 16px padding, focus-scroll wired),
   the inline error, and the `PageActionBar`.

3. **Header back button** — `HeaderCornerButton` in `app/gustavo/layout.tsx`
   maps the route back to the list it came from (`healthFormMatch`,
   `expenseEditMatch`, ...). Add a rule there when you add a route under a new
   section. It's the top-left corner: nothing on home, Gus on tab roots
   (`TAB_ROOTS`, tap → home), ← everywhere deeper. There is no nav drawer —
   bottom tabs + this corner are the whole navigation.

### Field conventions

- **Order**: date first (when the record has one), then the identifying
  field (name / place), then the bulk of the form, then free-text notes last.
- **Date** = `FormDateField` (`components/form-date-field.tsx`): the week
  strip + calendar button. Never a bare `<TextField type="date">` in a form
  that logs a dated entry. (Trip start/end are date *ranges*, so they keep the
  paired text fields.)
- **Labels** use `labelSx` / `errorLabelSx`; fields use `fieldSx` /
  `errorFieldSx` / `prefilledFieldSx` from `lib/form-styles.ts`. Required
  fields get a ` *` suffix on the label.
- **Validation** is inline: set `attempted` on submit, show red label + field
  + one message via `FormPage`'s `error`. No toasts, no alerts.
- **Submit label** wording: `Add` (expense), `Create` (trip, routine),
  `Log` (health entries), `Save` (every edit). In-flight: `Saving...` etc.
- **Sub-actions** that create a related record (save-as-routine, quick-add
  exercise, add location) get a small inline `primaryButtonSx` button next
  to their input — the action bar only ever submits the form itself.

### Detail pages

A record's read-only view is a page too — `<list>/[id]/page.tsx` — never a
drawer. Same shape as forms: a content component
(`components/health/workout-detail.tsx`, the receipts `drawer/*` pieces for
expenses) plus a `PageActionBar` in the route page with the record's actions
(Delete on the left in `colors.primaryRed`, then Duplicate / Edit). Edit's
cancel/success returns to the detail page; delete returns to the list.

### Deletes

Delete stays a confirm dialog opened from the detail page's action bar or a
swipe action — it is a one-tap confirmation, not a form. Use
`components/confirm-delete-dialog.tsx` (`ConfirmDeleteDialog`); the
expense/trip delete dialogs predate it and look the same.

### Gallery

Every page-style form has a chip in `/dev/gallery/forms`
(`app/dev/gallery/forms/page.tsx`) with fixture data, so it can be viewed
without clicking through the app. Health fixtures live in
`app/dev/gallery/health-fixtures.ts`.

### Migration status

See `.claude/docs/todos/forms-todo.md` for which forms are done and which are
still drawers/dialogs.

---

## Touch Gesture Conventions

The app has multiple custom touch handlers that can receive the same touch
(e.g. `components/receipts/swipeable-row.tsx` rows rendered inside
`components/pull-to-refresh.tsx`). Any new touch-gesture handler must follow
these rules so gestures never fight each other or the browser:

1. **Axis-lock on the first significant move** (~5px of travel): decide once
   whether the gesture is horizontal or vertical, then ignore the touch for the
   rest of the gesture if it's not on your axis. Never react to raw `dx`/`dy`
   per-event — a horizontal swipe always has some vertical drift, and reacting
   to it causes visible jitter (e.g. pull-to-refresh growing during a row swipe
   shifts the whole body down and back).
2. **Set `touch-action` CSS to reserve only your axis** (e.g. `pan-y` for a
   horizontal swipe handler). Without it the browser may start a native scroll
   first, after which `preventDefault` is a no-op (`e.cancelable === false`)
   and the drag stutters.
3. **`preventDefault()` once you own the gesture** (listener registered with
   `{ passive: false }`), so the browser doesn't scroll underneath you.
4. **Yield to descendants**: ancestor handlers must bail out when
   `e.defaultPrevented` is already true — an inner handler (fired first, since
   bubble listeners run inside-out) has claimed the gesture.
5. Keep latest callbacks in refs inside the listener effect so it doesn't
   re-attach on every parent render (callers pass inline closures).

Reference implementations: `swipeable-row.tsx` (horizontal, rules 1–4) and
`pull-to-refresh.tsx` (vertical, rules 1, 3–5).

### Swipe actions and delete feedback

- **One swipe pattern app-wide: `SwipeableRow`** — swipe reveals Edit (right)
  / Delete (left), the row rests open, tapping the button fires it. That tap
  IS the confirmation, so swipe deletes call the API directly (no dialog).
  Only one row is open at a time. For bordered cards, render it *inside* the
  card box (`overflow: hidden`) so the button reads as part of the card.
  Don't hand-roll swipe gestures.
- **Single-tap deletes (detail pages) keep `ConfirmDeleteDialog`** — pass
  `busy` and `error` (from `deleteErrorMessage()` in `utils/delete-error.ts`);
  on failure the dialog stays open with the reason inline.
- **Swipe-delete failures → toast.** `useMutation` deletes opt in with
  `meta: { errorToast: "Couldn't delete …" }` (global handler in
  `providers/query-provider.tsx`); raw `fetch` deletes must check `res.ok`
  and call `showToast()` from `components/toast-store.ts`.
- **Leaving after a delete → `exitTo(getBackHref(...))`** so the deleted page
  sits ahead in history, not behind. A missing record renders `GoneState`
  (calm message + a way out), never a bare "no longer exists" line.

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
