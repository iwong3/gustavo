'use client'

import { Box, Typography } from '@mui/material'
import {
    IconCalendarEvent,
    IconCurrencyDollar,
    IconSortAZ,
} from '@tabler/icons-react'
import { useMemo } from 'react'
import { useShallow } from 'zustand/react/shallow'

import { colors } from '@/lib/colors'
import FormDrawer from 'components/form-drawer'
import { useFilterLocationStore } from 'components/menu/filter/filter-location'
import { useFilterPaidByStore } from 'components/menu/filter/filter-paid-by'
import { useFilterSpendTypeStore } from 'components/menu/filter/filter-spend-type'
import { useFilterSplitBetweenStore } from 'components/menu/filter/filter-split-between'
import { useSortCostStore } from 'components/menu/sort/sort-cost'
import { useSortDateStore } from 'components/menu/sort/sort-date'
import { useSortItemNameStore } from 'components/menu/sort/sort-item-name'
import { useSortMenuStore } from 'components/menu/sort/sort-menu'
import { useSearchBarStore } from 'components/menu/search/search-bar'
import {
    getColorForCategory,
    getIconFromCategory,
    InitialsIcon,
} from 'utils/icons'

import type { ParticipantSummary } from '@/lib/types'

type Props = {
    open: boolean
    onClose: () => void
    participants: ParticipantSummary[]
    participantNames: string[]
    categoryNames: string[]
    locationNames: string[]
}

export function RefineDrawer({
    open,
    onClose,
    participants,
    participantNames,
    categoryNames,
    locationNames,
}: Props) {
    const participantMap = useMemo(() => {
        const m = new Map<string, ParticipantSummary>()
        for (const p of participants) m.set(p.firstName, p)
        return m
    }, [participants])

    const handleClearAll = () => {
        useFilterSplitBetweenStore.getState().reset(participantNames)
        useFilterPaidByStore.getState().reset(participantNames)
        useFilterSpendTypeStore.getState().reset(categoryNames)
        useFilterLocationStore.getState().reset(locationNames)
        useSortDateStore.getState().reset()
        useSortCostStore.getState().reset()
        useSortItemNameStore.getState().reset()
        useSortMenuStore.getState().setActive(false)
        useSearchBarStore.getState().reset()
    }

    return (
        <FormDrawer open={open} onClose={onClose}>
            <Box
                sx={{
                    flex: 1,
                    minHeight: 0,
                    overflowY: 'auto',
                    paddingX: 2.5,
                    paddingBottom: 2,
                }}>
                <Typography
                    sx={{
                        fontSize: 18,
                        fontWeight: 700,
                        color: colors.primaryBlack,
                        mb: 2,
                    }}>
                    Refine
                </Typography>

                <SortSection />

                {participantNames.length > 0 && (
                    <PaidBySection participantMap={participantMap} />
                )}
                {participantNames.length > 0 && (
                    <SplitBetweenSection participantMap={participantMap} />
                )}
                {categoryNames.length > 0 && <CategorySection />}
                {locationNames.length > 0 && <LocationSection />}
            </Box>

            {/* Footer */}
            <Box
                sx={{
                    flexShrink: 0,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    paddingX: 2.5,
                    paddingY: 1.5,
                    borderTop: `1px solid ${colors.primaryBlack}`,
                    backgroundColor: colors.primaryWhite,
                    gap: 1.5,
                }}>
                <Box
                    onClick={handleClearAll}
                    sx={{
                        'paddingY': 1,
                        'paddingX': 2,
                        'borderRadius': '4px',
                        'border': `1px solid ${colors.primaryBlack}`,
                        'backgroundColor': colors.primaryWhite,
                        'boxShadow': `2px 2px 0px ${colors.primaryBlack}`,
                        'cursor': 'pointer',
                        'fontSize': 13,
                        'fontWeight': 600,
                        'color': colors.primaryBlack,
                        '&:active': { opacity: 0.6 },
                    }}>
                    Clear all
                </Box>
                <Box
                    onClick={onClose}
                    sx={{
                        'paddingY': 1,
                        'paddingX': 3,
                        'borderRadius': '4px',
                        'border': `1px solid ${colors.primaryBlack}`,
                        'backgroundColor': colors.primaryYellow,
                        'boxShadow': `2px 2px 0px ${colors.primaryBlack}`,
                        'cursor': 'pointer',
                        'fontSize': 13,
                        'fontWeight': 700,
                        'color': colors.primaryBlack,
                        '&:active': { opacity: 0.6 },
                    }}>
                    Done
                </Box>
            </Box>
        </FormDrawer>
    )
}

// ─── Section wrapper ──────────────────────────────────────────────────────────

const SectionHeader = ({ label }: { label: string }) => (
    <Typography
        sx={{
            fontSize: 10,
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            color: colors.primaryBrown,
            mb: 1,
        }}>
        {label}
    </Typography>
)

const Section = ({
    label,
    children,
}: {
    label: string
    children: React.ReactNode
}) => (
    <Box sx={{ mb: 2.5 }}>
        <SectionHeader label={label} />
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>{children}</Box>
    </Box>
)

// ─── Chip primitives ─────────────────────────────────────────────────────────

const chipBase = {
    'display': 'flex',
    'alignItems': 'center',
    'gap': 0.75,
    'paddingX': 1.25,
    'paddingY': 0.75,
    'borderRadius': '4px',
    'border': `1px solid ${colors.primaryBlack}`,
    'cursor': 'pointer',
    'fontSize': 12,
    'transition': 'background-color 0.1s, box-shadow 0.1s, opacity 0.1s',
    '&:active': { opacity: 0.6 },
} as const

const activeChipSx = {
    ...chipBase,
    backgroundColor: colors.primaryYellow,
    boxShadow: `2px 2px 0px ${colors.primaryBlack}`,
    fontWeight: 600,
}

const inactiveChipSx = {
    ...chipBase,
    backgroundColor: colors.primaryWhite,
    boxShadow: 'none',
    opacity: 0.6,
    fontWeight: 500,
}

// ─── Sort section ────────────────────────────────────────────────────────────

function SortSection() {
    const {
        order: dateOrder,
        toggleSortOrder: toggleDate,
    } = useSortDateStore(useShallow((s) => s))
    const {
        order: costOrder,
        toggleSortOrder: toggleCost,
    } = useSortCostStore(useShallow((s) => s))
    const {
        order: nameOrder,
        toggleSortOrder: toggleName,
    } = useSortItemNameStore(useShallow((s) => s))

    const renderDirArrow = (order: number) => {
        if (order === 0) return null
        return (
            <Typography sx={{ fontSize: 11, fontWeight: 700, lineHeight: 1 }}>
                {order === 1 ? '↓' : '↑'}
            </Typography>
        )
    }

    return (
        <Section label="Sort by">
            <Box
                onClick={toggleDate}
                sx={dateOrder !== 0 ? activeChipSx : inactiveChipSx}>
                <IconCalendarEvent size={14} />
                Date
                {renderDirArrow(dateOrder)}
            </Box>
            <Box
                onClick={toggleCost}
                sx={costOrder !== 0 ? activeChipSx : inactiveChipSx}>
                <IconCurrencyDollar size={14} />
                Cost
                {renderDirArrow(costOrder)}
            </Box>
            <Box
                onClick={toggleName}
                sx={nameOrder !== 0 ? activeChipSx : inactiveChipSx}>
                <IconSortAZ size={14} />
                Name
                {renderDirArrow(nameOrder)}
            </Box>
        </Section>
    )
}

// ─── Paid By section ─────────────────────────────────────────────────────────

function PaidBySection({
    participantMap,
}: {
    participantMap: Map<string, ParticipantSummary>
}) {
    const filters = useFilterPaidByStore((s) => s.filters)
    const click = useFilterPaidByStore((s) => s.handleFilterClick)

    return (
        <Section label="Paid by">
            {Array.from(filters.entries()).map(([name, active]) => {
                const p = participantMap.get(name)
                return (
                    <Box
                        key={name}
                        onClick={() => click(name)}
                        sx={active ? activeChipSx : inactiveChipSx}>
                        <InitialsIcon
                            name={name}
                            initials={p?.initials}
                            iconColor={p?.iconColor}
                            sx={{ width: 20, height: 20, fontSize: 9 }}
                        />
                        {name}
                    </Box>
                )
            })}
        </Section>
    )
}

// ─── Split Between section ───────────────────────────────────────────────────

function SplitBetweenSection({
    participantMap,
}: {
    participantMap: Map<string, ParticipantSummary>
}) {
    const filters = useFilterSplitBetweenStore((s) => s.filters)
    const click = useFilterSplitBetweenStore((s) => s.handleFilterClick)

    return (
        <Section label="Split between">
            {Array.from(filters.entries()).map(([name, active]) => {
                const p = participantMap.get(name)
                return (
                    <Box
                        key={name}
                        onClick={() => click(name)}
                        sx={active ? activeChipSx : inactiveChipSx}>
                        <InitialsIcon
                            name={name}
                            initials={p?.initials}
                            iconColor={p?.iconColor}
                            sx={{ width: 20, height: 20, fontSize: 9 }}
                        />
                        {name}
                    </Box>
                )
            })}
        </Section>
    )
}

// ─── Category section ────────────────────────────────────────────────────────

function CategorySection() {
    const filters = useFilterSpendTypeStore((s) => s.filters)
    const click = useFilterSpendTypeStore((s) => s.handleFilterClick)

    return (
        <Section label="Category">
            {Array.from(filters.entries()).map(([cat, active]) => (
                <Box
                    key={cat}
                    onClick={() => click(cat)}
                    sx={{
                        ...(active ? activeChipSx : inactiveChipSx),
                        backgroundColor: active
                            ? getColorForCategory(cat)
                            : colors.primaryWhite,
                    }}>
                    {getIconFromCategory(cat, 14)}
                    {cat}
                </Box>
            ))}
        </Section>
    )
}

// ─── Location section ────────────────────────────────────────────────────────

function LocationSection() {
    const filters = useFilterLocationStore((s) => s.filters)
    const click = useFilterLocationStore((s) => s.handleFilterClick)

    return (
        <Section label="Location">
            {Array.from(filters.entries()).map(([loc, active]) => (
                <Box
                    key={loc}
                    onClick={() => click(loc)}
                    sx={active ? activeChipSx : inactiveChipSx}>
                    {loc}
                </Box>
            ))}
        </Section>
    )
}
