// Filter predicates for the expenses list.
//
// Shared by the spend-data provider (which filters the list) and the refine
// panel (which counts each option). They must agree — if the panel says "Food 4"
// and the list shows 5, one of them is lying. Hence one source of truth.
//
// Convention throughout: a facet with nothing selected matches everything. That
// is what "All" means on each card in the panel.

import type { Expense } from '@/lib/types'

export type FacetKey = 'split' | 'paidBy' | 'spendType' | 'location'

/** option name → selected. Options are rebuilt from trip data; see filter-stores. */
export type FilterMaps = Record<FacetKey, Map<string, boolean>>

export const FACET_KEYS: FacetKey[] = ['split', 'paidBy', 'spendType', 'location']

// Array.from rather than iterating filters.values() directly — the TS target
// here doesn't allow iterating a Map iterator without downlevelIteration.
const anyActive = (filters: Map<string, boolean>) =>
    Array.from(filters.values()).includes(true)

/** Selected option names, in the map's (trip-data) order. */
export const selectedOptions = (filters: Map<string, boolean>) =>
    Array.from(filters.entries())
        .filter(([, on]) => on)
        .map(([name]) => name)

export const countActive = (filters: Map<string, boolean>) =>
    selectedOptions(filters).length

function matchesFacet(
    exp: Expense,
    key: FacetKey,
    filters: Map<string, boolean>
): boolean {
    if (!anyActive(filters)) return true
    switch (key) {
        case 'split':
            // isEveryone expenses have an empty splitBetween but include everyone.
            return (
                exp.isEveryone ||
                exp.splitBetween.some((u) => filters.get(u.firstName) === true)
            )
        case 'paidBy':
            return filters.get(exp.paidBy.firstName) === true
        case 'spendType':
            return filters.get(exp.categoryName ?? 'Other') === true
        case 'location':
            return filters.get(exp.locationName ?? 'Other') === true
    }
}

/**
 * @param skip Leave one facet out of the query. The panel uses this so a facet's
 *   own options keep live counts while you're choosing among them — otherwise
 *   selecting "Food" would drop every other category's count to zero.
 */
export function filterExpenses(
    data: Expense[],
    maps: FilterMaps,
    skip?: FacetKey
): Expense[] {
    return data.filter((exp) =>
        FACET_KEYS.every(
            (key) => key === skip || matchesFacet(exp, key, maps[key])
        )
    )
}

/** Expenses matching a single option of a facet, within the current query. */
export function expensesForOption(
    data: Expense[],
    maps: FilterMaps,
    key: FacetKey,
    option: string
): Expense[] {
    const pool = filterExpenses(data, maps, key)
    const single = new Map([[option, true]])
    return pool.filter((exp) => matchesFacet(exp, key, single))
}
