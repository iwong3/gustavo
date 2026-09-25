'use client'

/** Gallery: My Spend insights components — animated chart + share list. */
import { Box } from '@mui/material'
import { useMemo, useState } from 'react'

import { expenseShareForUser } from '@/lib/spend'
import type { Expense } from '@/lib/types'
import { MySpendList, type SpendListVariant } from 'components/insights/my-spend-list'
import { CategoryBreakdown, DayCalendar, PlaceRoute } from 'components/insights/spend-views'
import type { MySpendRow, MySpendSort } from 'hooks/useMySpendData'

import MySpendPage from '../../../gustavo/trips/[slug]/graphs/page'
import { SpendDataProvider } from 'providers/spend-data-provider'
import { TripDataProvider } from 'providers/trip-data-provider'
import { GalleryPage, Specimen, SpecimenGroup } from '../gallery-ui'
import { ivan, jenny, makeExpense, marco, participants, priya, trip } from '../fixtures'

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
    // Blended-rate source so the conversion-error row below gets a USD value
    makeExpense({ name: 'Yen exchange', date: '2026-07-04', categoryName: 'Currency Exchange', categorySlug: 'currency_exchange', currency: 'JPY', costOriginal: 100, costConvertedUsd: 100, localCurrencyReceived: 15000, splitBetween: [ivan] }),
    // Conversion-error row: costConvertedUsd is null AT RUNTIME despite the
    // number type (API parseFloat → NaN → JSON.stringify → null). Crashed the
    // prod insights page on 2026-07-13 — keep this specimen to guard it.
    makeExpense({ name: 'Kaiten sushi (conv error)', date: '2026-07-04', categoryName: 'Food', currency: 'JPY', costOriginal: 3000, costConvertedUsd: null as unknown as number, conversionError: true, isEveryone: true, splitBetween: participants }),
]

/** Ivan's share rows over the fixture expenses, in a given sort. */
function useGalleryRows(sort: MySpendSort): MySpendRow[] {
    return useMemo(
        () =>
            galleryExpenses
                .map((expense) => {
                    // Conversion-error rows carry null at runtime — treat as 0
                    const usdTotal = Number.isFinite(expense.costConvertedUsd) ? expense.costConvertedUsd : 0
                    return {
                        expense,
                        usdTotal,
                        share: expenseShareForUser(expense, ivan.id, usdTotal, participants.length),
                    }
                })
                .filter((r) => r.share > 0.005)
                .sort((a, b) =>
                    sort === 'amount-desc'
                        ? b.share - a.share
                        : a.expense.date < b.expense.date
                          ? -1
                          : 1
                ),
        [sort]
    )
}

/** One list style over the fixture rows, with working sort/search chrome. */
function ListSpecimen({ variant, sort }: { variant: SpendListVariant; sort: MySpendSort }) {
    const [s, setS] = useState<MySpendSort>(sort)
    const [search, setSearch] = useState('')
    const rows = useGalleryRows(s).filter((r) =>
        r.expense.name.toLowerCase().includes(search.toLowerCase().trim())
    )
    return (
        <MySpendList
            rows={rows}
            sort={s}
            onSortChange={setS}
            search={search}
            onSearchChange={setSearch}
            onRowTap={() => {}}
            variant={variant}
            tripStartDate={trip.startDate}
            tripDays={10}
        />
    )
}

export default function InsightsGalleryPage() {
    return (
        <GalleryPage title="Insights">
            <SpecimenGroup title="Full page (real providers + hook, fixture data) — switch views, tap to filter, change person">
                <Specimen label="MySpendPage under Trip/SpendDataProvider">
                    <TripDataProvider
                        expenses={galleryExpenses}
                        trip={trip}>
                        <SpendDataProvider>
                            <MySpendPage />
                        </SpendDataProvider>
                    </TripDataProvider>
                </Specimen>
            </SpecimenGroup>
            <SpecimenGroup title="Expense list — the three styles">
                <Specimen label="groups (default) — the Expenses page format, tap a day header to collapse">
                    <ListSpecimen variant="groups" sort="date-asc" />
                </Specimen>
                <Specimen label="bands — by date">
                    <ListSpecimen variant="bands" sort="date-asc" />
                </Specimen>
                <Specimen label="agenda — by date">
                    <ListSpecimen variant="agenda" sort="date-asc" />
                </Specimen>
                <Specimen label="bands — by amount (flat, date in the subline)">
                    <ListSpecimen variant="bands" sort="amount-desc" />
                </Specimen>
                <Specimen label="agenda — by amount (date per row)">
                    <ListSpecimen variant="agenda" sort="amount-desc" />
                </Specimen>
            </SpecimenGroup>
            <SpecimenGroup title="States">
                <Specimen label="views — no data">
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                        <CategoryBreakdown data={[]} selectedKey={null} onSelect={() => {}} />
                        <DayCalendar data={[]} selectedKey={null} onSelect={() => {}} />
                        <PlaceRoute data={[]} selectedKey={null} onSelect={() => {}} />
                    </Box>
                </Specimen>
                <Specimen label="list — no matches">
                    <MySpendList
                        rows={[]}
                        sort="date-asc"
                        onSortChange={() => {}}
                        search="zzz"
                        onSearchChange={() => {}}
                        onRowTap={() => {}}
                    />
                </Specimen>
            </SpecimenGroup>
        </GalleryPage>
    )
}
