'use client'

import { Box, Typography } from '@mui/material'
import dayjs from 'dayjs'
import { useRouter } from 'next/navigation'
import { useCallback, useDeferredValue } from 'react'

import { cardSx, colors, pressShadowSx } from '@/lib/colors'
import type { Expense } from '@/lib/types'
import { AnimatedHeight } from 'components/animated-height'
import { MySpendList } from 'components/insights/my-spend-list'
import { PersonPicker } from 'components/insights/person-picker'
import { CategoryBreakdown, DayCalendar, PlaceRoute } from 'components/insights/spend-views'
import { PageInfo, PageInfoNote, PageInfoSection } from 'components/page-info'
import { PageTitleRow } from 'components/page-title-row'
import { SlidingToggle } from 'components/sliding-toggle'
import type { MySpendDimension } from 'hooks/useMySpendData'
import { useMySpendData } from 'hooks/useMySpendData'
import { useTweenedNumber } from 'hooks/use-tweened-number'
import { useSpendData } from 'providers/spend-data-provider'
import { useTripData } from 'providers/trip-data-provider'
import { formatUsd } from 'utils/currency'

const dimensionOptions = [
    { value: 'category', label: 'Category' },
    { value: 'day', label: 'Day' },
    { value: 'location', label: 'Place' },
]

export default function MySpendPage() {
    const { trip } = useTripData()
    const { participants } = useSpendData()
    const router = useRouter()

    const {
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
        overallTotal,
        tripDays,
        expenseCount,
        hasActiveFilters,
    } = useMySpendData()

    const isMe = String(personId) === String(trip.currentUserId)
    const displayName = isMe ? 'You' : (person?.firstName ?? 'Them')
    const possessive = isMe ? 'your' : `${person?.firstName ?? 'their'}'s`

    // ?from=graphs makes the header back button return here, not the
    // expenses list (see utils/back-href.ts). Stable callbacks so the
    // memoized list can skip renders that don't touch it.
    const expenseHref = useCallback(
        (expense: Expense) => `/gustavo/trips/${trip.slug}/expenses/${expense.id}?from=graphs`,
        [trip.slug]
    )
    const handleRowTap = useCallback((expense: Expense) => router.push(expenseHref(expense)), [router, expenseHref])

    // The list is the expensive part of a tap (100+ rows). Deferred, the
    // toggle, chart and total paint first and the list follows in an
    // interruptible background render — a tap never waits on it.
    const listRows = useDeferredValue(sortedRows)

    // Active filters as removable chips
    const chips: { kind: MySpendDimension; label: string }[] = []
    if (filters.category !== null) chips.push({ kind: 'category', label: filters.category })
    if (filters.location !== null) chips.push({ kind: 'location', label: filters.location })
    if (filters.day !== null) {
        chips.push({ kind: 'day', label: dayjs(filters.day + 'T00:00:00').format('MMM D') })
    }

    // Summary line under the big number: context without extra cards
    const pctOfAll = overallTotal > 0 ? Math.round((totalShare / overallTotal) * 100) : 0
    const summaryLine = hasActiveFilters
        ? `${pctOfAll}% of ${possessive} ${formatUsd(overallTotal)} · ${expenseCount} ${expenseCount === 1 ? 'expense' : 'expenses'}`
        : `${possessive} share · ${expenseCount} ${expenseCount === 1 ? 'expense' : 'expenses'} · ${formatUsd(overallTotal / tripDays)}/day`

    const View = dimension === 'day' ? DayCalendar : dimension === 'location' ? PlaceRoute : CategoryBreakdown

    return (
        <Box
            sx={{
                display: 'flex',
                flexDirection: 'column',
                width: '100%',
                maxWidth: 450,
                paddingX: 2,
                paddingY: 2,
                gap: 1.5,
            }}>
            <PageTitleRow title="Spending">
                <PageInfo title="How this page works">
                    <PageInfoSection title="Shares, not payments">
                        Every amount here is a person&apos;s share of each
                        expense, not what they paid: a $90 dinner split three
                        ways counts as $30.
                    </PageInfoSection>
                    <PageInfoSection title="Whose spending">
                        Tap the avatar to switch to anyone on the trip.
                    </PageInfoSection>
                    <PageInfoSection title="Views and filters">
                        Category, Day and Place slice the same spending. Tap a
                        category, a day or a stop to filter the list; filters
                        stack across views and show as chips next to the
                        avatar — tap × to clear one.
                    </PageInfoSection>
                    <PageInfoNote>Tap an expense to open it.</PageInfoNote>
                </PageInfo>
            </PageTitleRow>

            {/* Whose spending + what's filtered, as one line */}
            <PersonPicker
                participants={participants}
                selectedId={personId}
                currentUserId={trip.currentUserId}
                onSelect={setPersonId}>
                {chips.length === 0 ? (
                    <>
                        <Typography sx={{ fontSize: 14, fontWeight: 700, flexShrink: 0 }}>
                            {displayName}
                        </Typography>
                        <Typography noWrap sx={{ fontSize: 12, color: colors.primaryBrown }}>
                            · all expenses
                        </Typography>
                    </>
                ) : (
                    // Right-aligned, away from the avatar; scrolls if many
                    <Box
                        sx={{
                            'flex': 1,
                            'minWidth': 0,
                            'display': 'flex',
                            'overflowX': 'auto',
                            'paddingY': '3px',
                            'paddingRight': '3px',
                            'scrollbarWidth': 'none',
                            '&::-webkit-scrollbar': { display: 'none' },
                        }}>
                        <Box sx={{ display: 'flex', gap: 0.75, marginLeft: 'auto' }}>
                            {chips.map((chip) => (
                                <Box
                                    key={chip.kind}
                                    component="button"
                                    type="button"
                                    onClick={() => clearFilter(chip.kind)}
                                    aria-label={`Clear filter ${chip.label}`}
                                    sx={{
                                        ...pressShadowSx,
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: 0.75,
                                        height: 28,
                                        paddingX: 1.25,
                                        flexShrink: 0,
                                        backgroundColor: colors.primaryYellow,
                                        border: `1px solid ${colors.primaryBlack}`,
                                        boxShadow: `2px 2px 0px ${colors.primaryBlack}`,
                                        borderRadius: '14px',
                                        cursor: 'pointer',
                                        font: 'inherit',
                                        color: colors.primaryBlack,
                                    }}>
                                    <Typography sx={{ fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap' }}>
                                        {chip.label}
                                    </Typography>
                                    <Typography sx={{ fontSize: 14, fontWeight: 700, lineHeight: 1 }}>×</Typography>
                                </Box>
                            ))}
                        </Box>
                    </Box>
                )}
            </PersonPicker>

            <SlidingToggle
                value={dimension}
                options={dimensionOptions}
                onChange={(val) => setDimension(val as MySpendDimension)}
                fontSize={13}
                borderWidth={1}
            />

            {/* The chart card: summary on top, the view below */}
            <Box sx={{ ...cardSx, padding: 1.5 }}>
                <Typography
                    sx={{ fontFamily: 'var(--font-serif)', fontSize: 28, lineHeight: 1.1, fontVariantNumeric: 'tabular-nums' }}>
                    <RollingUsd value={totalShare} />
                </Typography>
                <Typography sx={{ fontSize: 12, color: colors.primaryBrown, marginTop: 0.25, marginBottom: 1.25 }}>
                    {summaryLine}
                </Typography>
                {/* Height eases between views; the new view fades in. Same
                    view + new person/filter keeps the element, so its bars
                    animate to the new values instead. */}
                <AnimatedHeight>
                    <Box
                        key={dimension}
                        sx={{
                            'animation': 'viewIn 150ms ease-out',
                            '@keyframes viewIn': {
                                from: { opacity: 0, transform: 'translateY(4px)' },
                                to: { opacity: 1, transform: 'none' },
                            },
                            '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
                        }}>
                        <View data={chartData} selectedKey={selectedChartKey} onSelect={toggleChartKey} />
                    </Box>
                </AnimatedHeight>
            </Box>

            <Box sx={{ marginTop: 1 }}>
                <MySpendList
                    rows={listRows}
                    sort={sort}
                    onSortChange={setSort}
                    search={search}
                    onSearchChange={setSearch}
                    onRowTap={handleRowTap}
                    rowHref={expenseHref}
                    soloLabel={isMe ? 'just you' : `just ${person?.firstName ?? 'them'}`}
                    tripStartDate={trip.startDate}
                    tripDays={tripDays}
                />
            </Box>
        </Box>
    )
}

/** The total rolls to its new amount rather than snapping. Its own component
 *  so the per-frame tween re-renders only this text, not the whole page. */
function RollingUsd({ value }: { value: number }) {
    return <>{formatUsd(useTweenedNumber(value))}</>
}
