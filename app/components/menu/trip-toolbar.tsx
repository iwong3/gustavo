'use client'

import { Box, Typography } from '@mui/material'
import { IconAdjustmentsHorizontal } from '@tabler/icons-react'
import { useEffect, useMemo } from 'react'

import { colors } from '@/lib/colors'
import { ActiveFilterLine } from 'components/menu/active-filter-line'
import { syncAllFilterStores } from 'components/menu/filter/filter-stores'
import { useRefineCount, useRefineStore } from 'components/menu/refine-store'
import { SearchBar } from 'components/menu/search/search-bar'
import { useTripData } from 'providers/trip-data-provider'

export const TripToolbar = () => {
    const { trip, expenses } = useTripData()

    const participantNames = useMemo(
        () => trip.participants.map((p) => p.firstName),
        [trip.participants]
    )
    const categoryNames = useMemo(
        () => Array.from(new Set(expenses.map((e) => e.categoryName ?? 'Other'))),
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

    // Keep the filter options in step with the data (a new expense can introduce
    // a category or location), preserving what's already selected. The layout
    // does the hard reset when the trip itself changes.
    useEffect(() => {
        syncAllFilterStores({ participantNames, categoryNames, locationNames })
    }, [participantNames, categoryNames, locationNames])

    const refineCount = useRefineCount()
    const refineOpen = useRefineStore((s) => s.open)

    // ActiveFilterLine renders exactly when something is refined, so this
    // predicts it without the toolbar having to reach inside.
    const showFilterLine = !refineOpen && refineCount > 0
    const toggleRefine = useRefineStore((s) => s.toggle)

    return (
        <Box
            sx={{
                position: 'sticky',
                top: 0,
                zIndex: 4,
                backgroundColor: colors.secondaryYellow,
                paddingTop: 1,
                // 16px below the search field on its own; 10px once the filter
                // line is between them, so the line gets equal air above and
                // below rather than 6 / 16.
                paddingBottom: showFilterLine ? 1.25 : 2,
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
                    open={refineOpen}
                    onClick={toggleRefine}
                />
            </Box>

            {/* Row 2: what's active (collapses when nothing is, hidden while
                refining — the panel already shows every selection in full) */}
            {showFilterLine && <ActiveFilterLine />}
        </Box>
    )
}

// ─── Refine button ───────────────────────────────────────────────────────────
// Also the close button — the control that opened the panel dismisses it.
//
// Yellow whenever it's doing something: the panel is open, or filters are on.
// It deliberately doesn't get its own "open" treatment — the panel filling the
// screen already says that, and a third state (it was black, pressed-in) only
// made the button harder to read than the two states it already has.

const RefineButton = ({
    count,
    open,
    onClick,
}: {
    count: number
    open: boolean
    onClick: () => void
}) => (
    <Box
        onClick={onClick}
        role="button"
        aria-pressed={open}
        aria-label={open ? 'Close refine' : 'Refine expenses'}
        sx={{
            'position': 'relative',
            'display': 'flex',
            'alignItems': 'center',
            'justifyContent': 'center',
            // Square, same 34px as the search input and header back button
            'width': 34,
            'height': 34,
            'borderRadius': '4px',
            'border': `1px solid ${colors.primaryBlack}`,
            'color': colors.primaryBlack,
            'backgroundColor':
                open || count > 0 ? colors.primaryYellow : colors.primaryWhite,
            'boxShadow': `2px 2px 0px ${colors.primaryBlack}`,
            'cursor': 'pointer',
            'flexShrink': 0,
            '&:active': { boxShadow: 'none', transform: 'translate(2px, 2px)' },
            'transition':
                'transform 0.1s, box-shadow 0.1s, background-color 0.14s',
        }}>
        <IconAdjustmentsHorizontal size={16} />
        {/* The badge stays up while the panel is open — the count is still true,
            and hiding it made the button flicker on every open/close. */}
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
