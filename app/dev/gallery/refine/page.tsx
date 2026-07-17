'use client'

import { Box, Typography } from '@mui/material'
import { useEffect } from 'react'

import { colors } from '@/lib/colors'
import { resetAllFilterStores } from 'components/menu/filter/filter-stores'
import { RefinePanel } from 'components/menu/refine-panel'
import { useSortStore } from 'components/menu/sort/sort-store'
import { filterExpenses, type FilterMaps } from 'utils/expense-filters'
import {
    useFilterLocationStore,
    useFilterPaidByStore,
    useFilterSpendTypeStore,
    useFilterSplitBetweenStore,
} from 'components/menu/filter/filter-stores'
import { GalleryPage, Specimen, SpecimenGroup } from '../gallery-ui'
import { expenses, trip } from '../fixtures'

/** The panel counts options in USD. Fixtures carry costConvertedUsd, and the
 *  conversion-error row carries 0 — the real getUsdValue guards with
 *  Number.isFinite, so this stand-in does too. */
const getUsdValue = (exp: (typeof expenses)[number]) =>
    Number.isFinite(exp.costConvertedUsd) ? (exp.costConvertedUsd ?? 0) : 0

const participantNames = trip.participants.map((p) => p.firstName)
const categoryNames = Array.from(
    new Set(expenses.map((e) => e.categoryName ?? 'Other'))
)
const locationNames = Array.from(
    new Set(
        expenses.map((e) => e.locationName).filter((l): l is string => l != null)
    )
)

export default function RefineGallery() {
    // The stores hold the options, so seed them the way the trip layout does.
    // No accompanying state: writing to a Zustand store notifies its subscribers
    // below, so the seeded options render on the next pass by themselves.
    useEffect(() => {
        resetAllFilterStores({ participantNames, categoryNames, locationNames })
        useSortStore.getState().reset()
    }, [])

    const paidBy = useFilterPaidByStore((s) => s.filters)
    const split = useFilterSplitBetweenStore((s) => s.filters)
    const spendType = useFilterSpendTypeStore((s) => s.filters)
    const location = useFilterLocationStore((s) => s.filters)
    const maps: FilterMaps = { paidBy, split, spendType, location }

    const filtered = filterExpenses(expenses, maps)
    const total = filtered.reduce((t, e) => t + getUsdValue(e), 0)

    return (
        <GalleryPage title="Refine">
            <SpecimenGroup title="RefinePanel">
                {/* The panel opens every section only when every section fits.
                    Both branches are here because the decision is made once, from
                    the room available at mount — the easiest thing to get wrong. */}
                <Specimen label="560px — everything won't fit, so only Paid by opens">
                    <Box
                        sx={{
                            height: 560,
                            display: 'flex',
                            flexDirection: 'column',
                            backgroundColor: colors.secondaryYellow,
                        }}>
                        <RefinePanel
                            expenses={expenses}
                            participants={trip.participants}
                            getUsdValue={getUsdValue}
                        />
                    </Box>
                </Specimen>
                <Specimen label="900px — everything fits, so every section opens">
                    <Box
                        sx={{
                            height: 900,
                            display: 'flex',
                            flexDirection: 'column',
                            backgroundColor: colors.secondaryYellow,
                        }}>
                        <RefinePanel
                            expenses={expenses}
                            participants={trip.participants}
                            getUsdValue={getUsdValue}
                        />
                    </Box>
                </Specimen>
            </SpecimenGroup>

            <SpecimenGroup title="What the panel is filtering">
                <Specimen label="live result of the filters above">
                    <Box sx={{ p: 1.5 }}>
                        <Typography sx={{ fontSize: 13, fontWeight: 700, mb: 1 }}>
                            {filtered.length} of {expenses.length} · $
                            {Math.round(total).toLocaleString('en-US')}
                        </Typography>
                        {filtered.map((e) => (
                            <Typography
                                key={e.id}
                                sx={{ fontSize: 12, color: colors.primaryBrown }}>
                                {e.name} · {e.categoryName ?? 'Other'} ·{' '}
                                {e.paidBy.firstName}
                            </Typography>
                        ))}
                        {filtered.length === 0 && (
                            <Typography
                                sx={{ fontSize: 12, color: colors.primaryRed }}>
                                Nothing matches
                            </Typography>
                        )}
                    </Box>
                </Specimen>
            </SpecimenGroup>
        </GalleryPage>
    )
}
