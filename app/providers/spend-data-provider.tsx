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
    nameOrder: number,
    blendedRates: Map<number, Map<string, number>>
): Expense[] {
    if (costOrder !== 0) {
        return data.slice().sort((a, b) => {
            const aUsd = getExpenseUsdValue(a, blendedRates)
            const bUsd = getExpenseUsdValue(b, blendedRates)
            return costOrder === 1 ? bUsd - aUsd : aUsd - bUsd
        })
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

// --- Blended exchange rate calculation ---

/** Compute per-person blended exchange rates from currency exchange expenses.
 *  Returns a Map: payerId → { currency → rate (local per USD) } */
function computeBlendedRates(expenses: Expense[]): Map<number, Map<string, number>> {
    // payerId → currency → { totalUsd, totalLocal }
    const pools = new Map<number, Map<string, { totalUsd: number; totalLocal: number }>>()

    for (const exp of expenses) {
        if (exp.categorySlug !== 'currency_exchange') continue
        if (!exp.localCurrencyReceived || exp.localCurrencyReceived <= 0) continue

        const payerId = exp.paidBy.id
        const currency = exp.currency !== 'USD' ? exp.currency : 'USD'
        // For currency exchange: costOriginal is USD paid, localCurrencyReceived is local currency received
        const usdPaid = exp.costOriginal
        const localReceived = exp.localCurrencyReceived

        const payerPools = pools.get(payerId) ?? new Map()
        const pool = payerPools.get(currency) ?? { totalUsd: 0, totalLocal: 0 }
        pool.totalUsd += usdPaid
        pool.totalLocal += localReceived
        payerPools.set(currency, pool)
        pools.set(payerId, payerPools)
    }

    // Convert pools to rates: rate = totalLocal / totalUsd
    const rates = new Map<number, Map<string, number>>()
    pools.forEach((currencyPools, payerId) => {
        const payerRates = new Map<string, number>()
        currencyPools.forEach((pool, currency) => {
            if (pool.totalUsd > 0) {
                payerRates.set(currency, pool.totalLocal / pool.totalUsd)
            }
        })
        rates.set(payerId, payerRates)
    })

    return rates
}

/** Get the USD value of an expense, using blended rates for non-USD local currency expenses. */
function getExpenseUsdValue(
    exp: Expense,
    blendedRates: Map<number, Map<string, number>>
): number {
    // Currency exchange expenses are already in USD (costOriginal = USD paid)
    if (exp.categorySlug === 'currency_exchange') {
        return exp.costOriginal
    }

    // USD expenses — use directly
    if (exp.currency === 'USD') {
        return exp.costOriginal
    }

    // Non-USD expense — try to use payer's blended rate
    const payerRates = blendedRates.get(exp.paidBy.id)
    const blendedRate = payerRates?.get(exp.currency)
    if (blendedRate && blendedRate > 0) {
        return exp.costOriginal / blendedRate
    }

    // Fallback: use the pre-computed costConvertedUsd
    return exp.costConvertedUsd
}

// --- Debt calculation ---

function computeDebtMap(
    expenses: Expense[],
    participantCount: number
): { totalSpend: number; debtMap: Map<number, Map<number, number>> } {
    const blendedRates = computeBlendedRates(expenses)
    let totalSpend = 0
    const debtMap = new Map<number, Map<number, number>>()

    for (const exp of expenses) {
        const usdValue = getExpenseUsdValue(exp, blendedRates)
        totalSpend += usdValue
        const payerId = exp.paidBy.id
        const splitCount = exp.isEveryone ? participantCount : exp.splitBetween.length
        const splitCost = usdValue / splitCount

        // Build set of covered participant IDs for fast lookup
        const coveredIds = new Set(exp.coveredParticipants.map((p) => p.id))

        for (const participant of exp.splitBetween) {
            if (participant.id === payerId) continue
            if (coveredIds.has(participant.id)) continue // covered — no debt
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

    // Compute blended rates once from ALL expenses (including currency exchanges)
    const blendedRates = useMemo(() => computeBlendedRates(expenses), [expenses])

    const getUsdValue = useMemo(
        () => (exp: Expense) => getExpenseUsdValue(exp, blendedRates),
        [blendedRates]
    )

    const filteredExpenses = useMemo(() => {
        let filtered = expenses
        filtered = filterBySplitBetween(filtered, splitBetweenFilters)
        filtered = filterByPaidBy(filtered, paidByFilters)
        filtered = filterBySpendType(filtered, spendTypeFilters)
        filtered = filterByLocation(filtered, locationFilters)
        filtered = applySorting(filtered, costOrder, dateOrder, nameOrder, blendedRates)
        filtered = applySearch(filtered, searchInput)
        return filtered
    }, [
        expenses, splitBetweenFilters, paidByFilters, spendTypeFilters,
        locationFilters, costOrder, dateOrder, nameOrder, searchInput, blendedRates,
    ])

    const { totalSpend, debtMap } = useMemo(
        () => computeDebtMap(expenses, participants.length),
        [expenses, participants.length]
    )

    const summaries = useMemo(
        () => computeSummaries(filteredExpenses, expenses, splitBetweenFilters, participants.length),
        [filteredExpenses, expenses, splitBetweenFilters, participants.length]
    )

    const value = useMemo<SpendDataValue>(
        () => ({
            expenses,
            filteredExpenses,
            totalSpend,
            debtMap,
            participants,
            getUsdValue,
            ...summaries,
        }),
        [expenses, filteredExpenses, totalSpend, debtMap, participants, getUsdValue, summaries]
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
