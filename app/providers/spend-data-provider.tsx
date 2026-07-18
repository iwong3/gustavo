'use client'

import Fuse from 'fuse.js'
import { createContext, useContext, useDeferredValue, useMemo } from 'react'

import {
    useFilterLocationStore,
    useFilterPaidByStore,
    useFilterSpendTypeStore,
    useFilterSplitBetweenStore,
} from 'components/menu/filter/filter-stores'
import { useSearchBarStore } from 'components/menu/search/search-bar'
import { useSortStore, type SortDir, type SortField } from 'components/menu/sort/sort-store'
import { useTripData } from 'providers/trip-data-provider'
import { filterExpenses, type FilterMaps } from 'utils/expense-filters'

import { applySettlements } from '@/lib/debt'
import { computeBlendedRates, computeDebtMap, getExpenseUsdValue, type BlendedRates } from '@/lib/spend'
import type { Expense, SettlementRecord, UserSummary } from '@/lib/types'

type SpendDataValue = {
    expenses: Expense[]
    /** Recorded debt payments ("mark as paid"). Already folded into debtMap. */
    settlementRecords: SettlementRecord[]
    filteredExpenses: Expense[]
    isSearching: boolean
    searchInput: string
    totalSpend: number
    /** userId → userId → gross amount owed, net of recorded settlements. */
    debtMap: Map<number, Map<number, number>>
    filteredTotalSpend: number
    filteredPeopleTotalSpend: number
    totalSpendByPerson: Map<number, number>     // userId → total paid amount
    netSpendByPerson: Map<number, number>       // userId → net amount responsible for (after covered adjustments)
    totalSpendByType: Map<string, number>       // categoryName → amount
    totalSpendByLocation: Map<string, number>   // locationName → amount
    totalSpendByDate: Map<string, number>       // date → amount
    totalSpendByDateByPerson: Map<number, Map<string, number>> // userId → date → amount
    participants: UserSummary[]
    /** Get the USD value of an expense using blended exchange rates (falls back to costConvertedUsd). */
    getUsdValue: (exp: Expense) => number
}

const SpendDataContext = createContext<SpendDataValue | null>(null)

const fuseOptions = {
    keys: [
        { name: 'name', weight: 3 },
        { name: 'locationName', weight: 2 },
        { name: 'paidBy.firstName', weight: 1 },
    ],
    threshold: 0.5,
    distance: 100,
    ignoreLocation: true,
    includeMatches: true,
}

// --- Pure filter/sort/search functions ---

// The filter predicates live in utils/expense-filters — the refine panel counts
// each option with the same code that filters the list here, so the two can't
// disagree about what "matches" means.

function applySorting(
    data: Expense[],
    field: SortField,
    dir: SortDir,
    blendedRates: BlendedRates
): Expense[] {
    const asc = dir === 'asc'
    const sorted = data.slice()
    switch (field) {
        case 'amount':
            return sorted.sort((a, b) => {
                const aUsd = getExpenseUsdValue(a, blendedRates)
                const bUsd = getExpenseUsdValue(b, blendedRates)
                return asc ? aUsd - bUsd : bUsd - aUsd
            })
        case 'name':
            return sorted.sort((a, b) =>
                asc ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name)
            )
        case 'date':
        default:
            return sorted.sort((a, b) => {
                if (a.date !== b.date) {
                    const cmp = a.date < b.date ? -1 : 1
                    return asc ? cmp : -cmp
                }
                // Same day: most recently entered first, matching how the
                // date-grouped cards order rows within a group.
                return Number(b.id) - Number(a.id)
            })
    }
}

function applySearch(data: Expense[], searchInput: string): Expense[] {
    if (searchInput === '') return data
    const fuse = new Fuse(data, fuseOptions)
    const results = fuse.search(searchInput)
    return results.map((r) => r.item)
}

// Blended exchange rates + debt-map math live in lib/spend.ts (shared with
// the trips API route for boarding-pass stats).

// --- Summary computation ---

function computeSummaries(
    expenses: Expense[],
    allExpenses: Expense[],
    splitBetweenFilters: Map<string, boolean>,
    participantCount: number
) {
    const blendedRates = computeBlendedRates(allExpenses)
    let filteredTotalSpend = 0
    let filteredPeopleTotalSpend = 0
    const totalSpendByPerson = new Map<number, number>()
    const totalSpendByType = new Map<string, number>()
    const totalSpendByLocation = new Map<string, number>()
    const netSpendByPerson = new Map<number, number>()  // userId → net amount they're responsible for
    const totalSpendByDate = new Map<string, number>()
    const totalSpendByDateByPerson = new Map<number, Map<string, number>>()

    const isSplitFilterActive = Array.from(splitBetweenFilters.values()).includes(true)

    for (const exp of expenses) {
        const usdValue = getExpenseUsdValue(exp, blendedRates)
        filteredTotalSpend += usdValue

        // Per-person spend (what they paid)
        const prev = totalSpendByPerson.get(exp.paidBy.id) ?? 0
        totalSpendByPerson.set(exp.paidBy.id, prev + usdValue)

        // Per-category
        const cat = exp.categoryName ?? 'Other'
        totalSpendByType.set(cat, (totalSpendByType.get(cat) ?? 0) + usdValue)

        // Per-location
        const loc = exp.locationName ?? 'Other'
        totalSpendByLocation.set(loc, (totalSpendByLocation.get(loc) ?? 0) + usdValue)

        // Per-date
        totalSpendByDate.set(exp.date, (totalSpendByDate.get(exp.date) ?? 0) + usdValue)

        // Per-person split cost (what they owe from this expense)
        const splitCount = exp.isEveryone ? participantCount : exp.splitBetween.length
        const splitCost = usdValue / splitCount
        const coveredIds = new Set(exp.coveredParticipants.map((p) => p.id))

        for (const participant of exp.splitBetween) {
            // Net spend: covered participants' shares go to the payer instead
            if (coveredIds.has(participant.id)) {
                // Covered person doesn't pay — payer absorbs their share
                netSpendByPerson.set(
                    exp.paidBy.id,
                    (netSpendByPerson.get(exp.paidBy.id) ?? 0) + splitCost
                )
            } else {
                netSpendByPerson.set(
                    participant.id,
                    (netSpendByPerson.get(participant.id) ?? 0) + splitCost
                )
            }

            if (isSplitFilterActive && !splitBetweenFilters.get(participant.firstName)) {
                continue
            }
            filteredPeopleTotalSpend += splitCost

            // Per-person-per-date
            const personDateMap = totalSpendByDateByPerson.get(participant.id) ?? new Map()
            personDateMap.set(exp.date, (personDateMap.get(exp.date) ?? 0) + splitCost)
            totalSpendByDateByPerson.set(participant.id, personDateMap)
        }
    }

    return {
        filteredTotalSpend,
        filteredPeopleTotalSpend,
        totalSpendByPerson,
        netSpendByPerson,
        totalSpendByType,
        totalSpendByLocation,
        totalSpendByDate,
        totalSpendByDateByPerson,
    }
}

// --- Provider component: computes once, shares via context ---

export function SpendDataProvider({ children }: { children: React.ReactNode }) {
    const { expenses, settlements: settlementRecords, trip } = useTripData()
    const participants = trip.participants

    // UI state from Zustand stores — deferred so filter/sort/search chip visuals
    // update instantly while the expensive data recomputation happens in a
    // lower-priority render pass
    const splitBetweenFilters = useDeferredValue(useFilterSplitBetweenStore((s) => s.filters))
    const paidByFilters = useDeferredValue(useFilterPaidByStore((s) => s.filters))
    const spendTypeFilters = useDeferredValue(useFilterSpendTypeStore((s) => s.filters))
    const locationFilters = useDeferredValue(useFilterLocationStore((s) => s.filters))
    const sortField = useDeferredValue(useSortStore((s) => s.field))
    const sortDir = useDeferredValue(useSortStore((s) => s.dir))
    const searchInput = useDeferredValue(useSearchBarStore((s) => s.searchInput))

    // Compute blended rates once from ALL expenses (including currency exchanges)
    const blendedRates = useMemo(() => computeBlendedRates(expenses), [expenses])

    const getUsdValue = useMemo(
        () => (exp: Expense) => getExpenseUsdValue(exp, blendedRates),
        [blendedRates]
    )

    const filterMaps = useMemo<FilterMaps>(
        () => ({
            split: splitBetweenFilters,
            paidBy: paidByFilters,
            spendType: spendTypeFilters,
            location: locationFilters,
        }),
        [splitBetweenFilters, paidByFilters, spendTypeFilters, locationFilters]
    )

    const filteredExpenses = useMemo(() => {
        let filtered = filterExpenses(expenses, filterMaps)
        filtered = applySorting(filtered, sortField, sortDir, blendedRates)
        // Search last: Fuse returns by relevance, which deliberately overrides
        // the sort while a query is active.
        filtered = applySearch(filtered, searchInput)
        return filtered
    }, [expenses, filterMaps, sortField, sortDir, searchInput, blendedRates])

    const { totalSpend, debtMap } = useMemo(() => {
        const computed = computeDebtMap(expenses, participants.length)
        return {
            totalSpend: computed.totalSpend,
            // Recorded payments offset debts everywhere debts are shown
            debtMap: applySettlements(computed.debtMap, settlementRecords),
        }
    }, [expenses, participants.length, settlementRecords])

    const summaries = useMemo(
        () => computeSummaries(filteredExpenses, expenses, splitBetweenFilters, participants.length),
        [filteredExpenses, expenses, splitBetweenFilters, participants.length]
    )

    const isSearching = searchInput !== ''

    const value = useMemo<SpendDataValue>(
        () => ({
            expenses,
            settlementRecords,
            filteredExpenses,
            isSearching,
            searchInput,
            totalSpend,
            debtMap,
            participants,
            getUsdValue,
            ...summaries,
        }),
        [expenses, settlementRecords, filteredExpenses, isSearching, searchInput, totalSpend, debtMap, participants, getUsdValue, summaries]
    )

    return (
        <SpendDataContext.Provider value={value}>
            {children}
        </SpendDataContext.Provider>
    )
}

export function useSpendData(): SpendDataValue {
    const ctx = useContext(SpendDataContext)
    if (!ctx) {
        throw new Error('useSpendData must be used within SpendDataProvider')
    }
    return ctx
}
