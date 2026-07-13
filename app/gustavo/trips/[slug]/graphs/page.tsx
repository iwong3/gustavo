'use client'

import { Box, Typography } from '@mui/material'
import dayjs from 'dayjs'
import { useRouter } from 'next/navigation'

import { cardSx, colors, hardShadow } from '@/lib/colors'
import type { Expense } from '@/lib/types'
import { MySpendChart } from 'components/insights/my-spend-chart'
import { MySpendList } from 'components/insights/my-spend-list'
import { SlidingToggle } from 'components/sliding-toggle'
import type { MySpendDimension } from 'hooks/useMySpendData'
import { useMySpendData } from 'hooks/useMySpendData'
import { useSpendData } from 'providers/spend-data-provider'
import { useTripData } from 'providers/trip-data-provider'
import { InitialsIcon } from 'utils/icons'

const dimensionOptions = [
    { value: 'day', label: 'Day' },
    { value: 'category', label: 'Category' },
    { value: 'location', label: 'Location' },
]

// Null-safe: numeric API fields can be null at runtime (NaN → JSON null)
const formatUsd = (n: number | null | undefined) =>
    Number.isFinite(n)
        ? n!.toLocaleString('en-US', {
              style: 'currency',
              currency: 'USD',
              maximumFractionDigits: 0,
          })
        : '—'

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
        expenseCount,
        hasActiveFilters,
    } = useMySpendData()

    const isMe = personId === trip.currentUserId
    const possessive = isMe ? 'my' : `${person?.firstName ?? 'their'}'s`

    const handleRowTap = (expense: Expense) => {
        // ?from=graphs makes the header back button return here, not the
        // expenses list (see HeaderBackButton in app/gustavo/layout.tsx)
        router.push(
            `/gustavo/trips/${trip.slug}/expenses/${expense.id}?from=graphs`
        )
    }

    // Active filters as removable chips
    const chips: { kind: MySpendDimension; label: string }[] = []
    if (filters.category !== null) {
        chips.push({ kind: 'category', label: filters.category })
    }
    if (filters.location !== null) {
        chips.push({ kind: 'location', label: filters.location })
    }
    if (filters.day !== null) {
        chips.push({
            kind: 'day',
            label: dayjs(filters.day + 'T00:00:00').format('MMM D'),
        })
    }

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
            {/* Person switcher */}
            <Box sx={{ display: 'flex', gap: 1 }}>
                {participants.map((p) => {
                    const selected = p.id === personId
                    return (
                        <Box
                            key={p.id}
                            onClick={() => setPersonId(p.id)}
                            sx={{
                                'cursor': 'pointer',
                                'borderRadius': '50%',
                                'outline': selected
                                    ? `3px solid ${colors.primaryYellow}`
                                    : '3px solid transparent',
                                'outlineOffset': '1px',
                                'transition': 'outline-color 0.15s',
                                '&:active': {
                                    transform: 'translate(1px, 1px)',
                                },
                            }}>
                            {/* Only the active person keeps their color — the
                                rest go white so it's obvious whose page it is */}
                            <InitialsIcon
                                name={p.firstName}
                                initials={p.initials}
                                iconColor={
                                    selected ? p.iconColor : colors.primaryWhite
                                }
                                sx={{
                                    width: 40,
                                    height: 40,
                                    fontSize: 13,
                                    boxShadow: `2px 2px 0px ${colors.primaryBlack}`,
                                    transition: 'background-color 0.15s',
                                }}
                            />
                        </Box>
                    )
                })}
            </Box>

            {/* Filter chips */}
            <Box
                sx={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    gap: 0.75,
                    minHeight: 26,
                }}>
                {chips.length === 0 ? (
                    <Typography
                        sx={{
                            fontSize: 11.5,
                            color: 'text.secondary',
                        }}>
                        Tap a bar to filter — filters stack across tabs
                    </Typography>
                ) : (
                    chips.map((chip) => (
                        <Box
                            key={chip.kind}
                            onClick={() => clearFilter(chip.kind)}
                            sx={{
                                'display': 'inline-flex',
                                'alignItems': 'center',
                                'gap': 0.75,
                                'height': 26,
                                'paddingX': 1.25,
                                'backgroundColor': colors.primaryYellow,
                                ...hardShadow,
                                'borderRadius': '14px',
                                'cursor': 'pointer',
                                'userSelect': 'none',
                                '&:active': {
                                    boxShadow: 'none',
                                    transform: 'translate(2px, 2px)',
                                },
                                'transition':
                                    'transform 0.1s, box-shadow 0.1s',
                            }}>
                            <Typography
                                sx={{ fontSize: 12, fontWeight: 700 }}>
                                {chip.label}
                            </Typography>
                            <Typography
                                sx={{
                                    fontSize: 14,
                                    fontWeight: 700,
                                    lineHeight: 1,
                                }}>
                                &times;
                            </Typography>
                        </Box>
                    ))
                )}
            </Box>

            {/* Hero stats */}
            <Box sx={{ display: 'flex', gap: 1 }}>
                <Box
                    sx={{
                        ...cardSx,
                        flex: 1.7,
                        paddingX: 1.5,
                        paddingY: 1,
                    }}>
                    <Typography
                        sx={{
                            fontSize: 22,
                            fontWeight: 800,
                            lineHeight: 1.1,
                            fontVariantNumeric: 'tabular-nums',
                        }}>
                        {formatUsd(totalShare)}
                    </Typography>
                    <Typography
                        sx={{
                            fontSize: 10.5,
                            fontWeight: 600,
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px',
                            color: colors.primaryBrown,
                            marginTop: 0.25,
                        }}>
                        Total spent{hasActiveFilters ? ' · filtered' : ''}
                    </Typography>
                </Box>
                <Box
                    sx={{
                        ...cardSx,
                        flex: 1,
                        paddingX: 1.5,
                        paddingY: 1,
                    }}>
                    <Typography
                        sx={{
                            fontSize: 22,
                            fontWeight: 800,
                            lineHeight: 1.1,
                            fontVariantNumeric: 'tabular-nums',
                        }}>
                        {expenseCount}
                    </Typography>
                    <Typography
                        sx={{
                            fontSize: 10.5,
                            fontWeight: 600,
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px',
                            color: colors.primaryBrown,
                            marginTop: 0.25,
                        }}>
                        Expenses
                    </Typography>
                </Box>
            </Box>

            {/* Dimension tabs */}
            <SlidingToggle
                value={dimension}
                options={dimensionOptions}
                onChange={(val) => setDimension(val as MySpendDimension)}
                fontSize={13}
                borderWidth={1}
            />

            {/* Chart */}
            <MySpendChart
                data={chartData}
                dimension={dimension}
                selectedKey={selectedChartKey}
                onBarClick={toggleChartKey}
            />

            {/* Search + sort + expense list */}
            <MySpendList
                rows={sortedRows}
                sort={sort}
                onSortChange={setSort}
                search={search}
                onSearchChange={setSearch}
                onRowTap={handleRowTap}
                shareLabel={`${possessive} share`}
            />
        </Box>
    )
}
