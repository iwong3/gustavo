'use client'

import dayjs from 'dayjs'
import { useCallback, useMemo, useState } from 'react'

import { useSpendData } from 'providers/spend-data-provider'
import { useTripData } from 'providers/trip-data-provider'
import { getColorForCategory, getLocationColor } from 'utils/icons'

import { colors } from '@/lib/colors'
import { expenseShareForUser } from '@/lib/spend'
import type { Expense, UserSummary } from '@/lib/types'

export type MySpendDimension = 'day' | 'category' | 'location'

export type MySpendSort = 'date-asc' | 'date-desc' | 'amount-desc' | 'amount-asc'

export type MySpendChartDatum = {
    key: string
    label: string
    value: number
    color: string
}

/** An expense paired with the selected person's share of it. */
export type MySpendRow = {
    expense: Expense
    share: number
}

export type MySpendFilters = {
    category: string | null
    location: string | null
    day: string | null // ISO YYYY-MM-DD
}

const EMPTY_FILTERS: MySpendFilters = { category: null, location: null, day: null }

function matchesSearch(exp: Expense, query: string): boolean {
    if (!query) return true
    const haystack = (
        exp.name +
        ' ' +
        (exp.categoryName ?? 'Other') +
        ' ' +
        (exp.locationName ?? '')
    ).toLowerCase()
    return query
        .toLowerCase()
        .split(/\s+/)
        .every((word) => haystack.includes(word))
}

function matchesFilters(
    exp: Expense,
    f: MySpendFilters,
    ignore?: MySpendDimension
): boolean {
    if (ignore !== 'category' && f.category !== null) {
        if ((exp.categoryName ?? 'Other') !== f.category) return false
    }
    if (ignore !== 'location' && f.location !== null) {
        if ((exp.locationName ?? 'Other') !== f.location) return false
    }
    if (ignore !== 'day' && f.day !== null) {
        if (exp.date !== f.day) return false
    }
    return true
}

export function useMySpendData() {
    const { trip } = useTripData()
    const { expenses, participants, getUsdValue } = useSpendData()

    // Default to the logged-in user; fall back to the first participant when
    // viewing a public trip you're not part of.
    const defaultPersonId =
        participants.find((p) => p.id === trip.currentUserId)?.id ??
        participants[0]?.id ??
        0
    const [personId, setPersonId] = useState<number>(defaultPersonId)
    const [dimension, setDimension] = useState<MySpendDimension>('day')
    const [filters, setFilters] = useState<MySpendFilters>(EMPTY_FILTERS)
    const [search, setSearch] = useState('')
    const [sort, setSort] = useState<MySpendSort>('date-asc')

    const person: UserSummary | undefined = participants.find(
        (p) => p.id === personId
    )

    // Every expense the selected person has a share in
    const shareRows = useMemo((): MySpendRow[] => {
        const rows: MySpendRow[] = []
        for (const expense of expenses) {
            const share = expenseShareForUser(
                expense,
                personId,
                getUsdValue(expense),
                participants.length
            )
            if (share > 0.005) rows.push({ expense, share })
        }
        return rows
    }, [expenses, personId, getUsdValue, participants.length])

    // Rows matching all filters + search — drives stats and the list
    const filteredRows = useMemo(
        () =>
            shareRows.filter(
                (r) =>
                    matchesFilters(r.expense, filters) &&
                    matchesSearch(r.expense, search)
            ),
        [shareRows, filters, search]
    )

    // Chart ignores the active dimension's own filter so its bars stay
    // comparable (the selected bar highlights instead of standing alone)
    const chartRows = useMemo(
        () =>
            shareRows.filter(
                (r) =>
                    matchesFilters(r.expense, filters, dimension) &&
                    matchesSearch(r.expense, search)
            ),
        [shareRows, filters, search, dimension]
    )

    const chartData = useMemo((): MySpendChartDatum[] => {
        if (dimension === 'day') {
            // Domain: every trip day, plus any out-of-range expense dates
            const totals = new Map<string, number>()
            const start = dayjs(trip.startDate + 'T00:00:00')
            const end = dayjs(trip.endDate + 'T00:00:00')
            for (
                let d = start;
                !d.isAfter(end);
                d = d.add(1, 'day')
            ) {
                totals.set(d.format('YYYY-MM-DD'), 0)
            }
            for (const r of chartRows) {
                totals.set(
                    r.expense.date,
                    (totals.get(r.expense.date) ?? 0) + r.share
                )
            }
            return Array.from(totals.entries())
                .sort(([a], [b]) => (a < b ? -1 : 1))
                .map(([date, value]) => ({
                    key: date,
                    label: dayjs(date + 'T00:00:00').format('M/D'),
                    value,
                    color: colors.primaryYellow,
                }))
        }

        const totals = new Map<string, number>()
        for (const r of chartRows) {
            const key =
                dimension === 'category'
                    ? (r.expense.categoryName ?? 'Other')
                    : (r.expense.locationName ?? 'Other')
            totals.set(key, (totals.get(key) ?? 0) + r.share)
        }
        return Array.from(totals.entries())
            .sort(([, a], [, b]) => b - a)
            .map(([name, value]) => ({
                key: name,
                label: name,
                value,
                color:
                    dimension === 'category'
                        ? getColorForCategory(name)
                        : getLocationColor(name),
            }))
    }, [chartRows, dimension, trip.startDate, trip.endDate])

    const selectedChartKey = filters[dimension]

    // Tap a bar: single-select toggle on the active dimension
    const toggleChartKey = useCallback(
        (key: string) => {
            setFilters((prev) => ({
                ...prev,
                [dimension]: prev[dimension] === key ? null : key,
            }))
        },
        [dimension]
    )

    const clearFilter = useCallback((kind: MySpendDimension) => {
        setFilters((prev) => ({ ...prev, [kind]: null }))
    }, [])

    const sortedRows = useMemo(() => {
        const rows = [...filteredRows]
        switch (sort) {
            case 'amount-desc':
                return rows.sort((a, b) => b.share - a.share)
            case 'amount-asc':
                return rows.sort((a, b) => a.share - b.share)
            case 'date-desc':
                return rows.sort((a, b) =>
                    a.expense.date > b.expense.date ? -1 : 1
                )
            case 'date-asc':
            default:
                return rows.sort((a, b) =>
                    a.expense.date < b.expense.date ? -1 : 1
                )
        }
    }, [filteredRows, sort])

    const totalShare = useMemo(
        () => filteredRows.reduce((sum, r) => sum + r.share, 0),
        [filteredRows]
    )

    const hasActiveFilters =
        filters.category !== null ||
        filters.location !== null ||
        filters.day !== null ||
        search !== ''

    return {
        person,
        personId,
        setPersonId,
        dimension,
        setDimension,
        filters,
        clearFilter,
        search,
        setSearch,
        sort,
        setSort,
        chartData,
        selectedChartKey,
        toggleChartKey,
        sortedRows,
        totalShare,
        expenseCount: filteredRows.length,
        hasActiveFilters,
    }
}
