# Caching & Performance Plan

## Goal
Make navigation feel instant by caching server data on the client, while keeping
collaborative correctness (multi-user edits don't silently overwrite each other)
and giving users a clear manual refresh gesture (pull-to-refresh).

## Strategy
**Stale-while-revalidate via TanStack Query**, with:
- Blanket `staleTime: 30s` default — instant cache on navigation, background refetch when stale.
- `refetchOnWindowFocus: true` — auto-refresh when user returns to the PWA.
- `refetchOnReconnect: true` — auto-refresh when network returns.
- Explicit `invalidateQueries` after mutations the user makes.
- Pull-to-refresh on list pages — manual escape hatch.
- `updated_at` optimistic concurrency on writes that matter — protects against silent overwrites between users.
- No polling, no `refetchInterval`, no real-time push infrastructure.

State-management split stays: TanStack Query owns server state, Zustand keeps UI state, React Context keeps the active trip data hand-off (per existing architecture).

---

## Phase 1: Foundation

### 1.1 Install + configure TanStack Query
- `pnpm add @tanstack/react-query @tanstack/react-query-devtools`
- Create `app/providers/query-provider.tsx`:
  - `QueryClient` with global defaults:
    - `staleTime: 30_000`
    - `gcTime: 5 * 60_000`
    - `refetchOnWindowFocus: true`
    - `refetchOnReconnect: true`
    - `retry: 1` (don't hammer on real errors)
  - Wrap children, mount `<ReactQueryDevtools />` in dev only.
- Mount the provider above existing providers in the app layout (outside `TripDataProvider`).

### 1.2 Decide query-key conventions
Centralize in `lib/query-keys.ts` so invalidation is mechanical, not a string-match game:
```ts
export const queryKeys = {
  trips: {
    all: ['trips'] as const,
    list: () => [...queryKeys.trips.all, 'list'] as const,
    detail: (id: string) => [...queryKeys.trips.all, 'detail', id] as const,
    expenses: (id: string) => [...queryKeys.trips.detail(id), 'expenses'] as const,
    locations: (id: string) => [...queryKeys.trips.detail(id), 'locations'] as const,
    participants: (id: string) => [...queryKeys.trips.detail(id), 'participants'] as const,
  },
  expenseCategories: { all: ['expense-categories'] as const },
  users: { all: ['users'] as const, me: ['users', 'me'] as const },
  health: {
    workouts: ['health', 'workouts'] as const,
    exercises: ['health', 'exercises'] as const,
    supplements: ['health', 'supplements'] as const,
    supplementLogs: (date: string) => ['health', 'supplement-logs', date] as const,
    foods: ['health', 'foods'] as const,
    foodGroups: ['health', 'food-groups'] as const,
    foodLogs: (date: string) => ['health', 'food-logs', date] as const,
    symptoms: ['health', 'symptoms'] as const,
    symptomLogs: (date: string) => ['health', 'symptom-logs', date] as const,
    weightLogs: ['health', 'weight-logs'] as const,
    presets: ['health', 'presets'] as const,
  },
}
```
Hierarchical keys mean `invalidateQueries({ queryKey: queryKeys.trips.detail(id) })` invalidates expenses/locations/participants for that trip in one call.

### 1.3 Per-query staleTime overrides
Long staleTime (rarely-changing data):
- Users list: 10 min
- Muscle groups: `Infinity` (seed-only)
- Expense categories: 5 min
- Food groups: 5 min

Default 30s for everything else.

---

## Phase 2: Migrate read paths page-by-page
Order chosen so the highest-traffic pages benefit first and we have a working template before touching health.

For each page: replace `useEffect` + `fetch` + local `useState` with `useQuery(queryKeys.X, fetcher)`.

1. **Trips list** (`/gustavo`) — template page. Replace fetch in the page-level component. Keep `TripDataProvider` for the active-trip context separately.
2. **Trip detail / expenses** (highest collaborative-drift risk).
3. **Trip detail / locations**.
4. **Settings: categories, locations**.
5. **Health pages** in order: exercise, exercises library, supplements, diet, symptoms, weight, dashboard.

Keep page-component shape similar to today so `TripDataProvider` and Zustand UI state are untouched.

---

## Phase 3: Migrate mutations + add invalidation
For every POST/PUT/DELETE call in the app, convert to `useMutation` and add `onSuccess` invalidation.

Mutation pattern:
```ts
const mutation = useMutation({
  mutationFn: (input) => fetch(...).then(r => r.json()),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.trips.expenses(tripId) })
  },
})
```

Mutations to migrate (matching the API list in MEMORY):
- Trips: create, update, delete, participant add/remove, role change
- Expenses: create, update, delete
- Locations: create, update, delete
- Categories: create, update, delete
- User preferences
- Health: workouts, exercises, supplements + logs, foods + logs, symptoms + logs, weight logs, presets

Invalidation rule of thumb: **invalidate the parent key**, not just the specific one. Creating an expense invalidates `queryKeys.trips.detail(tripId)` so expenses + trip totals + anything else hanging off the trip refresh together.

---

## Phase 4: Optimistic concurrency (409 protection)
Goal: a second user's edit can't be silently overwritten when both had the same row open.

Scope (writes that matter):
- Expenses (PUT, DELETE)
- Trips (PUT, DELETE)
- Expense categories (PUT, DELETE)

Skip for now: health data (single-user), locations (low-conflict).

### 4.1 Schema
- `updated_at` already exists on most tables (verify in schema.md). Add where missing.
- Ensure DB triggers update `updated_at` on every UPDATE.

### 4.2 API
- Read endpoints include `updatedAt` in the response payload for the affected entity.
- Write endpoints accept `expectedUpdatedAt` in the body.
- SQL: `UPDATE ... WHERE id = $1 AND updated_at = $2 RETURNING *`. If 0 rows affected, return `409 Conflict` with body `{ error: 'conflict', currentUpdatedAt }`.

### 4.3 Client
- Form components track the `updatedAt` they read.
- Submit sends `expectedUpdatedAt`.
- On 409: toast — *"This was changed by someone else. Reload to see the latest."* Button on toast invalidates the query and refetches; closes the form.

---

## Phase 5: Pull-to-refresh
Add a small gesture handler for list pages.

### 5.1 Approach
Roll a tiny custom hook (~50 lines) rather than pulling a library — most libraries are heavy or stale. The hook:
- Listens for `touchstart`, `touchmove`, `touchend` on a scroll container.
- Activates only when scroll is at the top.
- Tracks pull distance, shows a spinner when threshold crossed (~70px).
- On release past threshold: calls a passed-in `onRefresh()`, awaits, hides spinner.

File: `app/components/pull-to-refresh.tsx` — wraps children, exposes `onRefresh` prop.

### 5.2 Wiring
On each list page, the `onRefresh` handler calls:
```ts
await queryClient.invalidateQueries({ queryKey: queryKeys.X })
```
The `await` ensures the spinner stays until refetch completes.

### 5.3 Pages to add it to
- Trips list
- Expenses list (per trip)
- All health log pages (workouts, supplements, diet, symptoms, weight)

Skip: forms, settings pages, dialogs.

---

## Out of scope (intentional)
- Polling / `refetchInterval` — not needed for our scale.
- Real-time push (SSE, WebSockets) — overkill for <10 users.
- Optimistic cache updates (`onMutate` rollback) — adds complexity; the instant-cache + invalidate pattern is fast enough.
- HTTP caching headers on `/api/*` — TanStack Query's in-memory cache is doing the same job better.
- Server Components migration — separate, larger refactor.

---

## Sequencing summary
1. Phase 1 (foundation) — half day.
2. Phase 2 (read migration) — page-by-page; ~1 day for trips + expenses, then incremental.
3. Phase 3 (mutation migration) — interleave with Phase 2 per page.
4. Phase 4 (409) — focused half day; touches schema + API + 2-3 forms.
5. Phase 5 (pull-to-refresh) — half day.

Phases 1-3 should be done together per page so the page is fully migrated before moving on. Phases 4-5 can be tackled independently afterwards.
