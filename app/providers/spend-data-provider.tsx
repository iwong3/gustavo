'use client'

import Fuse from 'fuse.js'
import { createContext, useContext, useDeferredValue, useMemo } from 'react'

import { useFilterLocationStore } from 'components/menu/filter/filter-location'
import { useFilterPaidByStore } from 'components/menu/filter/filter-paid-by'
import { useFilterSpendTypeStore } from 'components/menu/filter/filter-spend-type'
import { useFilterSplitBetweenStore } from 'components/menu/filter/filter-split-between'
import { useSearchBarStore } from 'components/menu/search/search-bar'
import { useSortCostStore } from 'components/menu/sort/sort-cost'
import { useSortDateStore } from 'components/menu/sort/sort-date'
import { useSortItemNameStore } from 'components/menu/sort/sort-item-name'
import { useTripData } from 'providers/trip-data-provider'

import type { Expense, UserSummary } from '@/lib/types'

type SpendDataValue = {
    expenses: Expense[]
    filteredExpenses: Expense[]
    totalSpend: number
    debtMap: Map<number, Map<number, number>> // userId → userId → amount
    filteredTotalSpend: number
    filteredPeopleTotalSpend: number
    totalSpendByPerson: Map<number, number>     // userId → amount
    totalSpendByType: Map<string, number>       // categoryName → amount
    totalSpendByLocation: Map<string, number>   // locationName → amount
    totalSpendByDate: Map<string, number>       // date → amount
    totalSpendByDateByPerson: Map<number, Map<string, number>> // userId → date → amount
    participants: UserSummary[]
}

const SpendDataContext = createContext<SpendDataValue | null>(null)

const fuseOptions = {
    keys: [
        { name: 'name', weight: 1 },
        { name: 'date', weight: 1 },
        { name: 'paidBy.firstName', weight: 1 },
        { name: 'locationName', weight: 1 },
    ],
    includeMatches: true,
}

// --- Pure filter/sort/search functions ---

function filterBySplitBetween(
    data: Expense[],
    filters: Map<string, boolean> // firstName → boolean
): Expense[] {
    const isAnyActive = Array.from(filters.values()).includes(true)
    if (!isAnyActive) return data
    return data.filter((exp) =>
        exp.isEveryone || exp.splitBetween.some((u) => filters.get(u.firstName))
    )
}

function filterByPaidBy(
    data: Expense[],
    filters: Map<string, boolean> // firstName → boolean
): Expense[] {
    const isAnyActive = Array.from(filters.values()).includes(true)
    if (!isAnyActive) return data
    return data.filter((exp) => filters.get(exp.paidBy.firstName))
}

function filterBySpendType(
    data: Expense[],
    filters: Map<string, boolean> // categoryName → boolean
): Expense[] {
    const isAnyActive = Array.from(filters.values()).includes(true)
    if (!isAnyActive) return data
    return data.filter((exp) => {
        const cat = exp.categoryName ?? 'Other'
        return filters.get(cat)
    })
}

function filterByLocation(
    data: Expense[],
    filters: Map<string, boolean> // locationName → boolean
): Expense[] {
    const isAnyActive = Array.from(filters.values()).includes(true)
    if (!isAnyActive) return data
    return data.filter((exp) => {
        const loc = exp.locationName ?? 'Other'
        return filters.get(loc)
    })
}

function applySorting(
    data: Expense[],
    costOrder: number,
    dateOrder: number,
    nameOrder: number
): Expense[] {
    if (costOrder !== 0) {
        return data.slice().sort((a, b) =>
            costOrder === 1
                ? b.costConvertedUsd - a.costConvertedUsd
                : a.costConvertedUsd - b.costConvertedUsd
        )
    }
    if (dateOrder !== 0) {
        return data.slice().sort((a, b) => {
            const da = new Date(a.date).getTime()
            const db = new Date(b.date).getTime()
            return dateOrder === 1 ? db - da : da - db
        })
    }
    if (nameOrder !== 0) {
        return data.slice().sort((a, b) =>
            nameOrder === 1
                ? a.name.localeCompare(b.name)
                : b.name.localeCompare(a.name)
        )
    }
    return data
}

function applySearch(data: Expense[], searchInput: string): Expense[] {
    if (searchInput === '') return data
    const fuse = new Fuse(data, fuseOptions)
    const results = fuse.search(searchInput)
    return results.map((r) => data[r.refIndex])
}

// --- Debt calculation ---

function computeDebtMap(
    expenses: Expense[],
    participantCount: number
): { totalSpend: number; debtMap: Map<number, Map<number, number>> } {
    let totalSpend = 0
    const debtMap = new Map<number, Map<number, number>>()

    for (const exp of expenses) {
        totalSpend += exp.costConvertedUsd
        const payerId = exp.paidBy.id
        const splitCount = exp.isEveryone ? participantCount : exp.splitBetween.length
        const splitCost = exp.costConvertedUsd / splitCount

        for (const participant of exp.splitBetween) {
            if (participant.id === payerId) continue
            // participant owes payer
            const owes = debtMap.get(participant.id) ?? new Map()
            owes.set(payerId, (owes.get(payerId) ?? 0) + splitCost)
            debtMap.set(participant.id, owes)
        }
    }

    return { totalSpend, debtMap }
}

// --- Summary computation ---

function computeSummaries(
    expenses: Expense[],
    splitBetweenFilters: Map<string, boolean>,
    participantCount: number
) {
    let filteredTotalSpend = 0
    let filteredPeopleTotalSpend = 0
    const totalSpendByPerson = new Map<number, number>()
    const totalSpendByType = new Map<string, number>()
    const totalSpendByLocation = new Map<string, number>()
    const totalSpendByDate = new Map<string, number>()
    const totalSpendByDateByPerson = new Map<number, Map<string, number>>()

    const isSplitFilterActive = Array.from(splitBetweenFilters.values()).includes(true)

    for (const exp of expenses) {
        filteredTotalSpend += exp.costConvertedUsd

        // Per-person spend (what they paid)
        const prev = totalSpendByPerson.get(exp.paidBy.id) ?? 0
        totalSpendByPerson.set(exp.paidBy.id, prev + exp.costConvertedUsd)

        // Per-category
        const cat = exp.categoryName ?? 'Other'
        totalSpendByType.set(cat, (totalSpendByType.get(cat) ?? 0) + exp.costConvertedUsd)

        // Per-location
        const loc = exp.locationName ?? 'Other'
        totalSpendByLocation.set(loc, (totalSpendByLocation.get(loc) ?? 0) + exp.costConvertedUsd)

        // Per-date
        totalSpendByDate.set(exp.date, (totalSpendByDate.get(exp.date) ?? 0) + exp.costConvertedUsd)

        // Per-person split cost (what they owe from this expense)
        const splitCount = exp.isEveryone ? participantCount : exp.splitBetween.length
        const splitCost = exp.costConvertedUsd / splitCount

        for (const participant of exp.splitBetween) {
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
        totalSpendByType,
        totalSpendByLocation,
        totalSpendByDate,
        totalSpendByDateByPerson,
    }
}

// --- Provider component: computes once, shares via context ---

export function SpendDataProvider({ children }: { children: React.ReactNode }) {
    const { expenses, trip } = useTripData()
    const participants = trip.participants

    // UI state from Zustand stores — deferred so filter/sort/search chip visuals
    // update instantly while the expensive data recomputation happens in a
    // lower-priority render pass
    const splitBetweenFilters = useDeferredValue(useFilterSplitBetweenStore((s) => s.filters))
    const paidByFilters = useDeferredValue(useFilterPaidByStore((s) => s.filters))
    const spendTypeFilters = useDeferredValue(useFilterSpendTypeStore((s) => s.filters))
    const locationFilters = useDeferredValue(useFilterLocationStore((s) => s.filters))
    const costOrder = useDeferredValue(useSortCostStore((s) => s.order))
    const dateOrder = useDeferredValue(useSortDateStore((s) => s.order))
    const nameOrder = useDeferredValue(useSortItemNameStore((s) => s.order))
    const searchInput = useDeferredValue(useSearchBarStore((s) => s.searchInput))

    const filteredExpenses = useMemo(() => {
        let filtered = expenses
        filtered = filterBySplitBetween(filtered, splitBetweenFilters)
        filtered = filterByPaidBy(filtered, paidByFilters)
        filtered = filterBySpendType(filtered, spendTypeFilters)
        filtered = filterByLocation(filtered, locationFilters)
        filtered = applySorting(filtered, costOrder, dateOrder, nameOrder)
        filtered = applySearch(filtered, searchInput)
        return filtered
    }, [
        expenses, splitBetweenFilters, paidByFilters, spendTypeFilters,
        locationFilters, costOrder, dateOrder, nameOrder, searchInput,
    ])

    const { totalSpend, debtMap } = useMemo(
        () => computeDebtMap(expenses, participants.length),
        [expenses, participants.length]
    )

    const summaries = useMemo(
        () => computeSummaries(filteredExpenses, splitBetweenFilters, participants.length),
        [filteredExpenses, splitBetweenFilters, participants.length]
    )

    const value = useMemo<SpendDataValue>(
        () => ({
            expenses,
            filteredExpenses,
            totalSpend,
            debtMap,
            participants,
            ...summaries,
        }),
        [expenses, filteredExpenses, totalSpend, debtMap, participants, summaries]
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
