// The four expense filter stores.
//
// They were four near-identical files, each pairing a store with a component
// that nothing rendered any more. One factory replaces the lot; the options a
// filter offers come from trip data, so every store is the same shape:
// `option name → selected`, insertion-ordered to match the data.
//
// Leaf module (no component imports) — the refine panel and the spend-data
// provider both read these, and utils must never import components.

import { create } from 'zustand'

import { countActive, selectedOptions } from 'utils/expense-filters'

export type FilterState = {
    /** option name → selected. Insertion order is the display order. */
    filters: Map<string, boolean>
}

export type FilterActions = {
    toggle: (option: string) => void
    isActive: () => boolean
    count: () => number
    selected: () => string[]
    /** Deselect everything, keeping the options. This is the "All" row. */
    clear: () => void
    /** Rebuild the options, dropping any selection. Used on trip load. */
    reset: (options: string[]) => void
    /** Rebuild the options, preserving selections that still exist. Used when a
     *  refetch changes the available options (a new category or location). */
    sync: (options: string[]) => void
}

export type FilterStore = FilterState & FilterActions

const mapFrom = (options: string[], prev?: Map<string, boolean>) => {
    const next = new Map<string, boolean>()
    for (const o of options) next.set(o, prev?.get(o) ?? false)
    return next
}

const createFilterStore = () =>
    create<FilterStore>()((set, get) => ({
        filters: new Map<string, boolean>(),

        toggle: (option) =>
            set((s) => {
                const filters = new Map(s.filters)
                filters.set(option, !filters.get(option))
                return { filters }
            }),

        isActive: () => countActive(get().filters) > 0,
        count: () => countActive(get().filters),
        selected: () => selectedOptions(get().filters),

        clear: () =>
            set((s) => {
                if (countActive(s.filters) === 0) return s
                return { filters: mapFrom(Array.from(s.filters.keys())) }
            }),

        reset: (options) => set({ filters: mapFrom(options) }),

        sync: (options) =>
            set((s) => {
                const same =
                    s.filters.size === options.length &&
                    options.every((o) => s.filters.has(o))
                // Bail out when nothing changed so a refetch can't churn the
                // Map identity and retrigger every downstream memo.
                if (same) return s
                return { filters: mapFrom(options, s.filters) }
            }),
    }))

export const useFilterPaidByStore = createFilterStore()
export const useFilterSplitBetweenStore = createFilterStore()
export const useFilterSpendTypeStore = createFilterStore()
export const useFilterLocationStore = createFilterStore()

export type FilterOptionNames = {
    participantNames: string[]
    categoryNames: string[]
    locationNames: string[]
}

/** Fresh trip → drop every selection and rebuild the options. */
export const resetAllFilterStores = ({
    participantNames,
    categoryNames,
    locationNames,
}: FilterOptionNames) => {
    useFilterPaidByStore.getState().reset(participantNames)
    useFilterSplitBetweenStore.getState().reset(participantNames)
    useFilterSpendTypeStore.getState().reset(categoryNames)
    useFilterLocationStore.getState().reset(locationNames)
}

/** Same trip, new data → keep selections, refresh the options. */
export const syncAllFilterStores = ({
    participantNames,
    categoryNames,
    locationNames,
}: FilterOptionNames) => {
    useFilterPaidByStore.getState().sync(participantNames)
    useFilterSplitBetweenStore.getState().sync(participantNames)
    useFilterSpendTypeStore.getState().sync(categoryNames)
    useFilterLocationStore.getState().sync(locationNames)
}

export const clearAllFilterStores = () => {
    useFilterPaidByStore.getState().clear()
    useFilterSplitBetweenStore.getState().clear()
    useFilterSpendTypeStore.getState().clear()
    useFilterLocationStore.getState().clear()
}
