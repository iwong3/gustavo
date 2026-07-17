// State for the refine panel: whether it's showing instead of the expense rows,
// plus the two things both the toolbar and the page need to know about it.
//
// The open flag lives in a store rather than the toolbar's local state because
// the button that toggles it (TripToolbar) and the surface it replaces (the
// page's list) are siblings, not parent and child.
//
// Leaf module (no component imports).

import { create } from 'zustand'

import {
    clearAllFilterStores,
    useFilterLocationStore,
    useFilterPaidByStore,
    useFilterSpendTypeStore,
    useFilterSplitBetweenStore,
} from 'components/menu/filter/filter-stores'
import { useSortStore } from 'components/menu/sort/sort-store'
import { countActive } from 'utils/expense-filters'

type RefineStore = {
    open: boolean
    toggle: () => void
    show: () => void
    close: () => void
}

export const useRefineStore = create<RefineStore>()((set) => ({
    open: false,
    toggle: () => set((s) => ({ open: !s.open })),
    show: () => set({ open: true }),
    close: () => set({ open: false }),
}))

/**
 * How many refinements are in play — every selected filter option, plus one if
 * the sort isn't the default. Drives the ⚙ badge and whether Reset does
 * anything.
 */
export const useRefineCount = () =>
    useFilterPaidByStore((s) => countActive(s.filters)) +
    useFilterSplitBetweenStore((s) => countActive(s.filters)) +
    useFilterSpendTypeStore((s) => countActive(s.filters)) +
    useFilterLocationStore((s) => countActive(s.filters)) +
    (useSortStore((s) => s.isDefault()) ? 0 : 1)

/** Back to square one: no filters, default sort. */
export const resetRefine = () => {
    clearAllFilterStores()
    useSortStore.getState().reset()
}
