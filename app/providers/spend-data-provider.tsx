'use client'

import Fuse from 'fuse.js'
import { useMemo } from 'react'

import { useFilterLocationStore } from 'components/menu/filter/filter-location'
import { useFilterPaidByStore } from 'components/menu/filter/filter-paid-by'
import { useFilterSpendTypeStore } from 'components/menu/filter/filter-spend-type'
import { useFilterSplitBetweenStore } from 'components/menu/filter/filter-split-between'
import { useSearchBarStore } from 'components/menu/search/search-bar'
import { useSortCostStore } from 'components/menu/sort/sort-cost'
import { useSortDateStore } from 'components/menu/sort/sort-date'
import { useSortItemNameStore } from 'components/menu/sort/sort-item-name'
import { useTripData } from 'providers/trip-data-provider'
import {
    processFilteredSpendData,
    processSpendData,
} from 'utils/data-processing'
import { Location, LocationByTrip } from 'utils/location'
import { Person } from 'utils/person'
import { Spend, SpendType } from 'utils/spend'

// All derived spend data, computed via useMemo from React-snapshot values.
// Reads raw data from TripDataContext (React state → Context).
// Reads UI state from Zustand stores (filter/sort/search).
// No store.get() calls — purely deterministic computation.
type SpendDataValue = {
    spendData: Spend[]
    filteredSpendData: Spend[]
    totalSpend: number
    debtMap: Map<Person, Map<Person, number>>
    filteredTotalSpend: number
    filteredPeopleTotalSpend: number
    totalSpendByPerson: Map<Person, number>
    totalSpendByType: Map<SpendType, number>
    totalSpendByLocation: Map<Location, number>
    totalSpendByDate: Map<string, number>
    totalSpendByDateByPerson: Map<Person, Map<string, number>>
}

// Fuse.js options for search
const fuseOptions = {
    keys: [
        { name: 'name', weight: 1 },
        { name: 'date', weight: 1 },
        { name: 'paidBy', weight: 1 },
        { name: 'location', weight: 1 },
    ],
    includeMatches: true,
}

// --- Pure filter/sort/search functions ---

function filterBySplitBetween(
    data: Spend[],
    filters: Map<Person, boolean>
): Spend[] {
    const isAnyActive = Array.from(filters.values()).includes(true)
    if (!isAnyActive) return data
    return data.filter((spend) =>
        spend.splitBetween.some(
            (p) => p === Person.Everyone || filters.get(p)
        )
    )
}

function filterByPaidBy(
    data: Spend[],
    filters: Map<Person, boolean>
): Spend[] {
    const isAnyActive = Array.from(filters.values()).includes(true)
    if (!isAnyActive) return data
    return data.filter((spend) => filters.get(spend.paidBy))
}

function filterBySpendType(
    data: Spend[],
    filters: Record<SpendType, boolean>
): Spend[] {
    const isAnyActive = Object.values(filters).some((v) => v)
    if (!isAnyActive) return data
    return data.filter((spend) => {
        if (spend.type === undefined) return filters[SpendType.Other]
        return filters[spend.type]
    })
}

function filterByLocation(
    data: Spend[],
    filters: Map<Location, boolean>
): Spend[] {
    const isAnyActive = Array.from(filters.values()).includes(true)
    if (!isAnyActive) return data
    return data.filter((spend) => {
        if (spend.location === undefined) return filters.get(Location.Other)
        if (!LocationByTrip[spend.trip].includes(spend.location))
            return filters.get(Location.Other)
        return filters.get(spend.location)
    })
}

function applySorting(
    data: Spend[],
    costOrder: number,
    dateOrder: number,
    nameOrder: number
): Spend[] {
    if (costOrder !== 0) {
        return data.slice().sort((a, b) =>
            costOrder === 1
                ? b.convertedCost - a.convertedCost
                : a.convertedCost - b.convertedCost
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

function applySearch(data: Spend[], searchInput: string): Spend[] {
    if (searchInput === '') return data
    const fuse = new Fuse(data, fuseOptions)
    const results = fuse.search(searchInput)
    return results.map((r) => data[r.refIndex])
}

export function useSpendData(): SpendDataValue {
    // Raw data from React Context (driven by React useState in page component)
    const { spendData, trip: currentTrip } = useTripData()

    // UI state from Zustand stores (filter selections, sort orders, search text)
    const splitBetweenFilters = useFilterSplitBetweenStore((s) => s.filters)
    const paidByFilters = useFilterPaidByStore((s) => s.filters)
    const spendTypeFilters = useFilterSpendTypeStore((s) => s.filters)
    const locationFilters = useFilterLocationStore((s) => s.filters)
    const costOrder = useSortCostStore((s) => s.order)
    const dateOrder = useSortDateStore((s) => s.order)
    const nameOrder = useSortItemNameStore((s) => s.order)
    const searchInput = useSearchBarStore((s) => s.searchInput)

    // Derived data — pure computation from the above snapshots
    const {
        filteredSpendData,
        filteredSpendDataWithoutSplitBetween,
        filteredSpendDataWithoutSpendType,
        filteredSpendDataWithoutLocation,
    } = useMemo(() => {
        let filtered = spendData
        filtered = filterBySplitBetween(filtered, splitBetweenFilters)
        filtered = filterByPaidBy(filtered, paidByFilters)
        filtered = filterBySpendType(filtered, spendTypeFilters)
        filtered = filterByLocation(filtered, locationFilters)
        filtered = applySorting(filtered, costOrder, dateOrder, nameOrder)
        filtered = applySearch(filtered, searchInput)

        let withoutSplitBetween = spendData
        withoutSplitBetween = filterByPaidBy(withoutSplitBetween, paidByFilters)
        withoutSplitBetween = filterBySpendType(withoutSplitBetween, spendTypeFilters)
        withoutSplitBetween = filterByLocation(withoutSplitBetween, locationFilters)

        let withoutSpendType = spendData
        withoutSpendType = filterBySplitBetween(withoutSpendType, splitBetweenFilters)
        withoutSpendType = filterByPaidBy(withoutSpendType, paidByFilters)
        withoutSpendType = filterByLocation(withoutSpendType, locationFilters)

        let withoutLocation = spendData
        withoutLocation = filterBySplitBetween(withoutLocation, splitBetweenFilters)
        withoutLocation = filterByPaidBy(withoutLocation, paidByFilters)
        withoutLocation = filterBySpendType(withoutLocation, spendTypeFilters)

        return {
            filteredSpendData: filtered,
            filteredSpendDataWithoutSplitBetween: withoutSplitBetween,
            filteredSpendDataWithoutSpendType: withoutSpendType,
            filteredSpendDataWithoutLocation: withoutLocation,
        }
    }, [
        spendData,
        splitBetweenFilters,
        paidByFilters,
        spendTypeFilters,
        locationFilters,
        costOrder,
        dateOrder,
        nameOrder,
        searchInput,
    ])

    const { totalSpend, debtMap } = useMemo(
        () => processSpendData(spendData, currentTrip),
        [spendData, currentTrip]
    )

    const summaries = useMemo(
        () =>
            processFilteredSpendData(
                filteredSpendData,
                filteredSpendDataWithoutSplitBetween,
                filteredSpendDataWithoutSpendType,
                filteredSpendDataWithoutLocation,
                splitBetweenFilters,
                currentTrip
            ),
        [
            filteredSpendData,
            filteredSpendDataWithoutSplitBetween,
            filteredSpendDataWithoutSpendType,
            filteredSpendDataWithoutLocation,
            splitBetweenFilters,
            currentTrip,
        ]
    )

    return {
        spendData,
        filteredSpendData,
        totalSpend,
        debtMap,
        ...summaries,
    }
}
