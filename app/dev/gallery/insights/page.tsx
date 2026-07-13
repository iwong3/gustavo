'use client'

/** Gallery: My Spend insights components — animated chart + share list. */
import { Box } from '@mui/material'
import { useMemo, useState } from 'react'

import { expenseShareForUser } from '@/lib/spend'
import type { Expense } from '@/lib/types'
import { MySpendChart } from 'components/insights/my-spend-chart'
import { MySpendList } from 'components/insights/my-spend-list'
import { SlidingToggle } from 'components/sliding-toggle'
import type {
    MySpendChartDatum,
    MySpendDimension,
    MySpendRow,
    MySpendSort,
} from 'hooks/useMySpendData'
import { getColorForCategory, getLocationColor } from 'utils/icons'

import { colors } from '@/lib/colors'
import { GalleryPage, Specimen, SpecimenGroup } from '../gallery-ui'
import { ivan, jenny, makeExpense, marco, participants, priya } from '../fixtures'

// A multi-day, multi-location spread so every dimension has shape
const galleryExpenses: Expense[] = [
    makeExpense({ name: 'Narita Express', date: '2026-07-02', categoryName: 'Transit', costConvertedUsd: 56, costOriginal: 56, isEveryone: true, splitBetween: participants }),
    makeExpense({ name: 'Ramen Nagi', date: '2026-07-02', categoryName: 'Food', costConvertedUsd: 62, costOriginal: 62, isEveryone: true, splitBetween: participants, paidBy: jenny }),
    makeExpense({ name: 'Hotel Gracery ×3', date: '2026-07-02', categoryName: 'Lodging', costConvertedUsd: 720, costOriginal: 720, isEveryone: true, splitBetween: participants, paidBy: marco }),
    makeExpense({ name: 'teamLab Planets', date: '2026-07-03', categoryName: 'Attraction', costConvertedUsd: 96, costOriginal: 96, isEveryone: true, splitBetween: participants }),
    makeExpense({ name: 'Yakitori alley', date: '2026-07-03', categoryName: 'Food', costConvertedUsd: 84, costOriginal: 84, isEveryone: true, splitBetween: participants, paidBy: priya }),
    makeExpense({ name: 'Shinkansen', date: '2026-07-05', categoryName: 'Transit', locationName: 'Kyoto', costConvertedUsd: 128, costOriginal: 128, isEveryone: true, splitBetween: participants, paidBy: jenny }),
    makeExpense({ name: 'Kaiseki splurge', date: '2026-07-05', categoryName: 'Food', locationName: 'Kyoto', costConvertedUsd: 240, costOriginal: 240, isEveryone: true, splitBetween: participants }),
    makeExpense({ name: 'Tea ceremony (treat)', date: '2026-07-06', categoryName: 'Attraction', locationName: 'Kyoto', costConvertedUsd: 72, costOriginal: 72, splitBetween: [ivan, jenny], coveredParticipants: [jenny] }),
    makeExpense({ name: 'Dotonbori crawl', date: '2026-07-08', categoryName: 'Food', locationName: 'Osaka', costConvertedUsd: 96, costOriginal: 96, isEveryone: true, splitBetween: participants, paidBy: marco }),
    makeExpense({ name: 'Omiyage haul', date: '2026-07-09', categoryName: 'Shopping', locationName: 'Osaka', costConvertedUsd: 85, costOriginal: 85, splitBetween: [ivan] }),
]

const dimensionOptions = [
    { value: 'day', label: 'Day' },
    { value: 'category', label: 'Category' },
    { value: 'location', label: 'Location' },
]

/** Standalone interactive harness — mirrors the page wiring without providers. */
function InteractiveMySpend() {
    const [dimension, setDimension] = useState<MySpendDimension>('day')
    const [selectedKey, setSelectedKey] = useState<string | null>(null)
    const [search, setSearch] = useState('')
    const [sort, setSort] = useState<MySpendSort>('date-asc')

    const rows = useMemo((): MySpendRow[] => {
        return galleryExpenses
            .map((expense) => ({
                expense,
                share: expenseShareForUser(
                    expense,
                    ivan.id,
                    expense.costConvertedUsd,
                    participants.length
                ),
            }))
            .filter((r) => r.share > 0.005)
            .filter((r) => {
                const haystack = (
                    r.expense.name +
                    ' ' +
                    (r.expense.categoryName ?? '') +
                    ' ' +
                    (r.expense.locationName ?? '')
                ).toLowerCase()
                return haystack.includes(search.toLowerCase().trim())
            })
            .sort((a, b) =>
                sort === 'amount-desc'
                    ? b.share - a.share
                    : sort === 'amount-asc'
                      ? a.share - b.share
                      : sort === 'date-desc'
                        ? (a.expense.date > b.expense.date ? -1 : 1)
                        : (a.expense.date < b.expense.date ? -1 : 1)
            )
    }, [search, sort])

    const chartData = useMemo((): MySpendChartDatum[] => {
        const totals = new Map<string, number>()
        for (const r of rows) {
            const key =
                dimension === 'day'
                    ? r.expense.date
                    : dimension === 'category'
                      ? (r.expense.categoryName ?? 'Other')
                      : (r.expense.locationName ?? 'Other')
            totals.set(key, (totals.get(key) ?? 0) + r.share)
        }
        return Array.from(totals.entries())
            .sort(([a], [b]) => (a < b ? -1 : 1))
            .map(([key, value]) => ({
                key,
                label: dimension === 'day' ? key.slice(5).replace('-', '/') : key,
                value,
                color:
                    dimension === 'day'
                        ? colors.primaryYellow
                        : dimension === 'category'
                          ? getColorForCategory(key)
                          : getLocationColor(key),
            }))
    }, [rows, dimension])

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            <SlidingToggle
                value={dimension}
                options={dimensionOptions}
                onChange={(val) => {
                    setDimension(val as MySpendDimension)
                    setSelectedKey(null)
                }}
                fontSize={13}
                borderWidth={1}
            />
            <MySpendChart
                data={chartData}
                dimension={dimension}
                selectedKey={selectedKey}
                onBarClick={(key) =>
                    setSelectedKey((prev) => (prev === key ? null : key))
                }
            />
            <MySpendList
                rows={rows}
                sort={sort}
                onSortChange={setSort}
                search={search}
                onSearchChange={setSearch}
                onRowTap={() => {}}
                shareLabel="my share"
            />
        </Box>
    )
}

export default function InsightsGalleryPage() {
    return (
        <GalleryPage title="Insights">
            <SpecimenGroup title="My Spend (interactive — switch tabs, tap bars, search, sort)">
                <Specimen label="chart + list, Ivan's shares">
                    <InteractiveMySpend />
                </Specimen>
            </SpecimenGroup>
            <SpecimenGroup title="States">
                <Specimen label="chart — no data">
                    <MySpendChart
                        data={[]}
                        dimension="category"
                        selectedKey={null}
                        onBarClick={() => {}}
                    />
                </Specimen>
                <Specimen label="list — no matches">
                    <MySpendList
                        rows={[]}
                        sort="date-asc"
                        onSortChange={() => {}}
                        search="zzz"
                        onSearchChange={() => {}}
                        onRowTap={() => {}}
                        shareLabel="my share"
                    />
                </Specimen>
            </SpecimenGroup>
        </GalleryPage>
    )
}
