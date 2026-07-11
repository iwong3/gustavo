# State Management Overhaul Plan

## Problem Summary

The current architecture stores **derived data** (filtered lists, totals, summaries)
in Zustand and updates it via `useEffect`. This causes:

1. **Stale derived state** — Menu's filter effect missed `spendData` in its deps,
   so `filteredSpendData` stayed empty when data loaded
2. **Hydration mismatches** — Zustand stores are empty on server but populated on
   client. Fixed with `dynamic({ ssr: false })` but the root cause is architectural.
3. **Fragile render-order dependencies** — `resetAllMenuItemStores` uses module-level
   `Set`s populated during Menu's render. If Menu hasn't mounted, resets are no-ops.
4. **Unnecessary re-renders** — `useShallow((state) => state)` subscribes to the
   entire store. Any field change re-renders the component.

## Design Principles

1. **Derived data is computed, not stored** — use `useMemo`, never `useEffect` + `set`
2. **Stores hold only source-of-truth state** — raw data + user choices
3. **Individual selectors** — `useStore(s => s.field)`, never `useShallow(s => s)`
4. **Single owner per piece of state** — one place writes, many places read

## New Architecture

### State Categories

| Category | Examples | Where it lives |
|---|---|---|
| Server data | `spendData` (expense rows) | Zustand `useSpendStore` (set once after fetch) |
| User choices | Active filters, sort order, search query | Zustand `useFilterStore` (single consolidated store) |
| UI state | Active view, expanded menu, dialog open | Zustand `useUIStore` or local `useState` |
| Derived data | `filteredSpendData`, totals, debt map | `useMemo` in a React context provider |

### Store Definitions

#### `useSpendStore` (replaces spendData portion of useGustavoStore)
```ts
type SpendStore = {
    spendData: Spend[]
    setSpendData: (data: Spend[]) => void
}
```
- **Written by**: TripDetailPage (on fetch + refresh)
- **Read by**: SpendDataProvider (to compute derived data)

#### `useFilterStore` (replaces 4 separate filter stores + sort stores + search)
```ts
type FilterStore = {
    // Filter state — which items are toggled on
    splitBetween: Map<Person, boolean>
    paidBy: Map<Person, boolean>
    spendType: Map<SpendType, boolean>
    location: Map<Location, boolean>

    // Sort state
    sortField: 'cost' | 'date' | 'name' | null
    sortOrder: 'asc' | 'desc'

    // Search
    searchQuery: string

    // Actions
    toggleFilter: (category: string, key: string) => void
    setSort: (field: string, order: string) => void
    setSearch: (query: string) => void
    reset: (trip: Trip) => void  // resets all filters for a trip
}
```
- **Written by**: Filter UI components, Menu reset button
- **Read by**: SpendDataProvider (to compute filtered data)

#### `useUIStore` (replaces useToolsMenuStore, useSummaryStore, useSettingsIconLabelsStore)
```ts
type UIStore = {
    activeView: ToolsMenuItem
    summaryView: SummaryView
    showIconLabels: boolean

    setActiveView: (view: ToolsMenuItem) => void
    setSummaryView: (view: SummaryView) => void
    setShowIconLabels: (show: boolean) => void
}
```
- **Written by**: Tools menu, Settings menu, swipe handler
- **Read by**: Gustavo (to pick ActiveComponent), Summary, Menu

#### `useTripsStore` (simplified)
```ts
type TripsStore = {
    currentTrip: Trip
    fetchDataError: boolean
    currencyConversionError: boolean
    setCurrentTrip: (trip: Trip) => void
    setFetchDataError: (error: boolean) => void
    setCurrencyConversionError: (error: boolean) => void
}
```
No changes needed — this store is already clean.

### SpendDataProvider (replaces all derived state)

Instead of storing `filteredSpendData`, `totalSpend`, `totalSpendByPerson`, etc.
in Zustand and updating via effects, compute everything in a context provider:

```tsx
// app/providers/spend-data-provider.tsx
const SpendDataContext = createContext<SpendData>(...)

export function SpendDataProvider({ children }) {
    const spendData = useSpendStore(s => s.spendData)
    const currentTrip = useTripsStore(s => s.currentTrip)
    const filters = useFilterStore(s => s)  // or individual selectors

    // All derived data computed via useMemo — always correct, no stale state
    const filteredSpendData = useMemo(() => {
        let result = spendData
        result = applyFilter(result, 'splitBetween', filters.splitBetween)
        result = applyFilter(result, 'paidBy', filters.paidBy)
        result = applyFilter(result, 'spendType', filters.spendType)
        result = applyFilter(result, 'location', filters.location)
        result = applySort(result, filters.sortField, filters.sortOrder)
        result = applySearch(result, filters.searchQuery)
        return result
    }, [spendData, filters])

    const { totalSpend, debtMap } = useMemo(
        () => processSpendData(spendData, currentTrip),
        [spendData, currentTrip]
    )

    const summaries = useMemo(
        () => processFilteredSpendData(filteredSpendData, ...),
        [filteredSpendData, ...]
    )

    return (
        <SpendDataContext.Provider value={{
            spendData,
            filteredSpendData,
            totalSpend,
            debtMap,
            ...summaries,
        }}>
            {children}
        </SpendDataContext.Provider>
    )
}

export const useSpendData = () => useContext(SpendDataContext)
```

### Component Changes

| Component | Before | After |
|---|---|---|
| ReceiptsList | `useGustavoStore(s => s.filteredSpendData)` | `useSpendData().filteredSpendData` |
| Summary | `useGustavoStore(s => s.totalSpendByPerson)` | `useSpendData().totalSpendByPerson` |
| DebtCalculator | `useGustavoStore(s => s.debtMapByPerson)` | `useSpendData().debtMap` |
| Menu | filter effect (154-214) → **DELETE** | Just renders filter UI, no effect needed |
| Gustavo | two `useEffect`s for derived data → **DELETE** | Wraps children in `<SpendDataProvider>` |
| Filter components | Own stores with `filter()` method | Read/write `useFilterStore` |

### What Gets Deleted

- `useGustavoStore` — all derived fields (filteredSpendData*, totalSpend*, etc.)
  Only `spendData` survives (moved to `useSpendStore`)
- Menu's filter `useEffect` (lines 154-214) — replaced by useMemo in provider
- Gustavo's `processSpendData` effect — replaced by useMemo in provider
- Gustavo's `processFilteredSpendData` effect — replaced by useMemo in provider
- Module-level `filterMenuItemStoreResets` / `sortMenuItemStoreResets` Sets
- `resetAllMenuItemStores` function — replaced by `useFilterStore.reset(trip)`
- 4 separate filter stores → 1 consolidated `useFilterStore`
- 3 separate sort stores → sort fields in `useFilterStore`

## Migration Plan (incremental, each step is independently shippable)

### Step 1: SpendDataProvider + delete derived state from Gustavo store
- Create `SpendDataProvider` with `useMemo` computations
- Wrap Gustavo's children in provider
- Update consumers to use `useSpendData()` instead of `useGustavoStore`
- Delete derived fields from `useGustavoStore`
- Delete Menu's filter effect and Gustavo's summary effects

### Step 2: Consolidate filter stores
- Create `useFilterStore` with all filter/sort/search state
- Update filter UI components to use new store
- Delete individual filter/sort stores
- Delete `resetAllMenuItemStores` and module-level Sets

### Step 3: Consolidate UI stores
- Create `useUIStore` (merge tools menu + summary + settings stores)
- Update consumers

### Step 4: Clean up useGustavoStore
- Only `spendData` + `setSpendData` remain
- Rename to `useSpendStore` for clarity

## Why This Fixes Everything

1. **No hydration issues** — derived data isn't in stores, so server/client
   stores are trivially identical (both empty). `dynamic({ ssr: false })` is
   still used but the architecture no longer depends on it.

2. **No stale derived state** — `useMemo` always recomputes when inputs change.
   Missing dependency arrays are impossible because React warns about them
   in useMemo (and they'd cause stale UI, not silent bugs).

3. **No render-order dependencies** — filter computation happens in a provider,
   not in Menu's effect. Provider renders before children, so data is always
   available.

4. **Fewer re-renders** — individual selectors mean components only re-render
   when their specific data changes.
