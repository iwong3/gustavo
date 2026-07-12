'use client'

import { Box, Typography } from '@mui/material'
import { IconAdjustmentsHorizontal } from '@tabler/icons-react'
import { useEffect, useMemo, useState } from 'react'

import { colors } from '@/lib/colors'
import { ActiveChips } from 'components/menu/active-chips'
import { useFilterLocationStore } from 'components/menu/filter/filter-location'
import { useFilterPaidByStore } from 'components/menu/filter/filter-paid-by'
import { useFilterSpendTypeStore } from 'components/menu/filter/filter-spend-type'
import { useFilterSplitBetweenStore } from 'components/menu/filter/filter-split-between'
import { RefineDrawer } from 'components/menu/refine-drawer'
import { SearchBar } from 'components/menu/search/search-bar'
import { useSortCostStore } from 'components/menu/sort/sort-cost'
import { useSortDateStore } from 'components/menu/sort/sort-date'
import { useSortItemNameStore } from 'components/menu/sort/sort-item-name'
import { sortStoreResets } from 'components/menu/sort/sort-menu'
import { useTripData } from 'providers/trip-data-provider'

export const TripToolbar = () => {
    const { trip, expenses } = useTripData()

    const participantNames = useMemo(
        () => trip.participants.map((p) => p.firstName),
        [trip.participants]
    )
    const categoryNames = useMemo(
        () =>
            Array.from(
                new Set(expenses.map((e) => e.categoryName ?? 'Other'))
            ),
        [expenses]
    )
    const locationNames = useMemo(
        () =>
            Array.from(
                new Set(
                    expenses
                        .map((e) => e.locationName)
                        .filter((l): l is string => l != null)
                )
            ),
        [expenses]
    )

    // Keep location filter store in sync when expenses change
    useEffect(() => {
        useFilterLocationStore.getState().sync(locationNames)
    }, [locationNames])

    // Register sort resets for cross-store coordination
    const sortDateReset = useSortDateStore((s) => s.reset)
    const sortCostReset = useSortCostStore((s) => s.reset)
    const sortItemNameReset = useSortItemNameStore((s) => s.reset)
    useEffect(() => {
        sortStoreResets.add(sortDateReset)
        sortStoreResets.add(sortCostReset)
        sortStoreResets.add(sortItemNameReset)
    }, [sortDateReset, sortCostReset, sortItemNameReset])

    // Count of active refinements for the button badge
    const filterPaidByActive = useFilterPaidByStore((s) =>
        Array.from(s.filters.values()).filter(Boolean).length
    )
    const filterSplitActive = useFilterSplitBetweenStore((s) =>
        Array.from(s.filters.values()).filter(Boolean).length
    )
    const filterSpendTypeActive = useFilterSpendTypeStore((s) =>
        Array.from(s.filters.values()).filter(Boolean).length
    )
    const filterLocationActive = useFilterLocationStore((s) =>
        Array.from(s.filters.values()).filter(Boolean).length
    )
    const sortDateOrder = useSortDateStore((s) => s.order)
    const sortCostOrder = useSortCostStore((s) => s.order)
    const sortNameOrder = useSortItemNameStore((s) => s.order)

    const refineCount =
        filterPaidByActive +
        filterSplitActive +
        filterSpendTypeActive +
        filterLocationActive +
        (sortDateOrder !== 0 ? 1 : 0) +
        (sortCostOrder !== 0 ? 1 : 0) +
        (sortNameOrder !== 0 ? 1 : 0)

    const [drawerOpen, setDrawerOpen] = useState(false)

    return (
        <>
            <Box
                sx={{
                    position: 'sticky',
                    top: 0,
                    zIndex: 4,
                    backgroundColor: colors.secondaryYellow,
                    paddingTop: 1,
                    paddingBottom: 2,
                }}>
                {/* Row 1: search + refine button */}
                <Box
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                        paddingX: 2,
                    }}>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                        <SearchBar />
                    </Box>
                    <RefineButton
                        count={refineCount}
                        onClick={() => setDrawerOpen(true)}
                    />
                </Box>

                {/* Row 2: active chips (collapses when empty) */}
                <ActiveChips />
            </Box>

            <RefineDrawer
                open={drawerOpen}
                onClose={() => setDrawerOpen(false)}
                participants={trip.participants}
                participantNames={participantNames}
                categoryNames={categoryNames}
                locationNames={locationNames}
            />
        </>
    )
}

// ─── Refine button with badge ────────────────────────────────────────────────

const RefineButton = ({
    count,
    onClick,
}: {
    count: number
    onClick: () => void
}) => (
    <Box
        onClick={onClick}
        sx={{
            'position': 'relative',
            'display': 'flex',
            'alignItems': 'center',
            'justifyContent': 'center',
            // Matches the search input height so the row reads as one unit
            'width': 36,
            'height': 36,
            'borderRadius': '4px',
            'border': `1px solid ${colors.primaryBlack}`,
            'backgroundColor':
                count > 0 ? colors.primaryYellow : colors.primaryWhite,
            'boxShadow': `2px 2px 0px ${colors.primaryBlack}`,
            'cursor': 'pointer',
            'flexShrink': 0,
            '&:active': { opacity: 0.6 },
        }}>
        <IconAdjustmentsHorizontal size={16} />
        {count > 0 && (
            <Typography
                sx={{
                    position: 'absolute',
                    top: -6,
                    right: -6,
                    fontSize: 10,
                    fontWeight: 700,
                    lineHeight: 1,
                    color: colors.primaryBlack,
                    backgroundColor: colors.primaryWhite,
                    border: `1px solid ${colors.primaryBlack}`,
                    borderRadius: '100%',
                    minWidth: 16,
                    height: 16,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    paddingX: 0.25,
                }}>
                {count}
            </Typography>
        )}
    </Box>
)
