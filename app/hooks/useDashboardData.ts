'use client'

import dayjs from 'dayjs'
import { useCallback, useMemo, useState } from 'react'

import { useSpendData } from 'providers/spend-data-provider'
import { useTripData } from 'providers/trip-data-provider'
import { getColorForCategory, getLocationColor } from 'utils/icons'

import type { Expense } from '@/lib/types'

export type Dimension = 'person' | 'category' | 'location'

export type ChartDatum = {
    key: string
    label: string
    value: number
    color: string
}

export type TimelineSegment = {
    category: string
    value: number
    color: string
}

export type TimelineDataPoint = {
    date: string
    segments: TimelineSegment[]
    total: number
}

export type DashboardStats = {
    totalSpend: number
    avgPerDay: number
    avgPerPerson: number
    biggestExpense: { name: string; amount: number } | null
    topCategory: { name: string; amount: number } | null
    expenseCount: number
    tripDurationDays: number
    filterLabel: string | null // e.g. "Food" when cross-filtered
}

export type PersonMetric = 'paid' | 'spent'

export function useDashboardData() {
    const { trip } = useTripData()
    const {
        filteredExpenses,
        totalSpendByPerson,
        netSpendByPerson,
        totalSpendByType,
        totalSpendByLocation,
        participants,
        getUsdValue,
    } = useSpendData()

    const [activeDimension, setActiveDimensionRaw] = useState<Dimension>('person')
    const [selectedKey, setSelectedKey] = useState<string | null>(null)
    const [personMetric, setPersonMetric] = useState<PersonMetric>('paid')

    // Switching dimension clears selection
    const setActiveDimension = useCallback((dim: Dimension) => {
        setActiveDimensionRaw(dim)
        setSelectedKey(null)
    }, [])

    const handleBarClick = useCallback(
        (index: number, chartData: ChartDatum[]) => {
            const key = chartData[index]?.key ?? null
            setSelectedKey((prev) => (prev === key ? null : key))
        },
        []
    )

    const clearSelection = useCallback(() => setSelectedKey(null), [])

    // Cross-filter expenses based on selectedKey + activeDimension
    const crossFilteredExpenses = useMemo(() => {
        if (!selectedKey) return filteredExpenses
        return filteredExpenses.filter((exp) => {
            switch (activeDimension) {
                case 'person':
                    return exp.paidBy.id === Number(selectedKey)
                case 'category':
                    return (exp.categoryName ?? 'Other') === selectedKey
                case 'location':
                    return (exp.locationName ?? 'Other') === selectedKey
                default:
                    return true
            }
        })
    }, [filteredExpenses, selectedKey, activeDimension])

    // Primary chart data — always from FULL filteredExpenses (not cross-filtered)
    const chartData = useMemo((): ChartDatum[] => {
        switch (activeDimension) {
            case 'person': {
                const dataSource = personMetric === 'spent' ? netSpendByPerson : totalSpendByPerson
                return participants.map((p) => ({
                    key: String(p.id),
                    label: p.firstName,
                    value: dataSource.get(p.id) ?? 0,
                    color: p.iconColor ?? '#f7cd83',
                }))
            }
            case 'category': {
                return Array.from(totalSpendByType.entries()).map(
                    ([name, amount]) => ({
                        key: name,
                        label: name,
                        value: amount,
                        color: getColorForCategory(name),
                    })
                )
            }
            case 'location': {
                return Array.from(totalSpendByLocation.entries()).map(
                    ([name, amount]) => ({
                        key: name,
                        label: name,
                        value: amount,
                        color: getLocationColor(name),
                    })
                )
            }
        }
    }, [
        activeDimension,
        participants,
        totalSpendByPerson,
        netSpendByPerson,
        personMetric,
        totalSpendByType,
        totalSpendByLocation,
    ])

    // Stats computed from cross-filtered expenses
    const stats = useMemo((): DashboardStats => {
        const startDate = dayjs(trip.startDate)
        const endDate = dayjs(trip.endDate)
        const tripDurationDays = Math.max(endDate.diff(startDate, 'day') + 1, 1)
        const participantCount = Math.max(participants.length, 1)

        let totalSpend = 0
        let biggest: { name: string; amount: number } | null = null
        const categoryTotals = new Map<string, number>()

        for (const exp of crossFilteredExpenses) {
            const usdValue = getUsdValue(exp)
            totalSpend += usdValue
            if (!biggest || usdValue > biggest.amount) {
                biggest = { name: exp.name, amount: usdValue }
            }
            const cat = exp.categoryName ?? 'Other'
            categoryTotals.set(cat, (categoryTotals.get(cat) ?? 0) + usdValue)
        }

        let topCategory: { name: string; amount: number } | null = null
        categoryTotals.forEach((amount, name) => {
            if (!topCategory || amount > topCategory.amount) {
                topCategory = { name, amount }
            }
        })

        // Determine cross-filter label
        let filterLabel: string | null = null
        if (selectedKey) {
            if (activeDimension === 'person') {
                filterLabel = participants.find((p) => String(p.id) === selectedKey)?.firstName ?? selectedKey
            } else {
                filterLabel = selectedKey
            }
        }

        return {
            totalSpend,
            avgPerDay: totalSpend / tripDurationDays,
            avgPerPerson: totalSpend / participantCount,
            biggestExpense: biggest,
            topCategory,
            expenseCount: crossFilteredExpenses.length,
            tripDurationDays,
            filterLabel,
        }
    }, [crossFilteredExpenses, trip, participants, selectedKey, activeDimension, getUsdValue])

    // Timeline data — from cross-filtered expenses, grouped by date, stacked by category
    const timelineData = useMemo((): TimelineDataPoint[] => {
        const dateMap = new Map<string, Map<string, number>>()

        for (const exp of crossFilteredExpenses) {
            const dateKey = exp.date
            const cat = exp.categoryName ?? 'Other'
            const catMap = dateMap.get(dateKey) ?? new Map<string, number>()
            catMap.set(cat, (catMap.get(cat) ?? 0) + getUsdValue(exp))
            dateMap.set(dateKey, catMap)
        }

        // Sort by date ascending
        const sortedDates = Array.from(dateMap.keys()).sort(
            (a, b) => dayjs(a).valueOf() - dayjs(b).valueOf()
        )

        return sortedDates.map((date) => {
            const catMap = dateMap.get(date)!
            const segments: TimelineSegment[] = Array.from(catMap.entries()).map(
                ([category, value]) => ({
                    category,
                    value,
                    color: getColorForCategory(category),
                })
            )
            const total = segments.reduce((sum, s) => sum + s.value, 0)
            return { date: dayjs(date).format('M/D'), segments, total }
        })
    }, [crossFilteredExpenses, getUsdValue])

    // Unique categories for the timeline legend
    const timelineCategories = useMemo(() => {
        const cats = new Set<string>()
        for (const exp of crossFilteredExpenses) {
            cats.add(exp.categoryName ?? 'Other')
        }
        return Array.from(cats).map((name) => ({
            name,
            color: getColorForCategory(name),
        }))
    }, [crossFilteredExpenses])

    return {
        activeDimension,
        setActiveDimension,
        selectedKey,
        handleBarClick,
        clearSelection,
        chartData,
        stats,
        timelineData,
        timelineCategories,
        crossFilteredExpenses,
        personMetric,
        setPersonMetric,
    }
}
