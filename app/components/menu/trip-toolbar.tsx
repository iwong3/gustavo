'use client'

import {
    Box,
    ClickAwayListener,
    InputAdornment,
    TextField,
    Typography,
} from '@mui/material'
import {
    IconCalendarEvent,
    IconCurrencyDollar,
    IconDotsVertical,
    IconFilter,
    IconLayoutNavbarCollapse,
    IconRefresh,
    IconSearch,
    IconSortAscending,
    IconSortAZ,
    IconX,
} from '@tabler/icons-react'
import { memo, useEffect, useMemo, useRef, useState } from 'react'
import { useShallow } from 'zustand/react/shallow'

import { colors } from '@/lib/colors'
import { useFilterLocationStore } from 'components/menu/filter/filter-location'
import { useFilterPaidByStore } from 'components/menu/filter/filter-paid-by'
import { useFilterSpendTypeStore } from 'components/menu/filter/filter-spend-type'
import { useFilterSplitBetweenStore } from 'components/menu/filter/filter-split-between'
import { useCollapseAllStore } from 'components/menu/items/collapse-all'
import { useSearchBarStore } from 'components/menu/search/search-bar'
import { useSortCostStore } from 'components/menu/sort/sort-cost'
import { useSortDateStore } from 'components/menu/sort/sort-date'
import { useSortItemNameStore } from 'components/menu/sort/sort-item-name'
import { sortStoreResets, useSortMenuStore } from 'components/menu/sort/sort-menu'
import {
    ToolsMenuItem,
    ToolsMenuItemMap,
    useToolsMenuStore,
} from 'components/menu/tools/tools-menu'
import { SummaryView, useSummaryStore } from 'components/summary/summary'
import { useTripData } from 'providers/trip-data-provider'
import {
    getColorForCategory,
    getIconFromCategory,
    getToolsMenuItemIcon,
    InitialsIcon,
    LocationIcon,
} from 'utils/icons'

type Panel = 'filter' | 'sort' | 'nav' | null

const TOOLBAR_HEIGHT = 34
const PANEL_BORDER = colors.primaryBlack

// Summary items set
const SUMMARY_ITEMS = new Set([
    ToolsMenuItem.TotalSpend,
    ToolsMenuItem.TotalSpendByPerson,
    ToolsMenuItem.TotalSpendByType,
    ToolsMenuItem.TotalSpendByLocation,
    ToolsMenuItem.TotalSpendByDate,
])

// ─── Main toolbar ─────────────────────────────────────────────────────────────

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

    // View navigation
    const activeItem = useToolsMenuStore((s) => s.activeItem)
    const setActiveItem = useToolsMenuStore((s) => s.setActiveItem)
    const setActiveView = useSummaryStore((s) => s.setActiveView)

    const isSummaryActive = SUMMARY_ITEMS.has(activeItem)
    const isReceiptsActive = activeItem === ToolsMenuItem.Receipts

    const navigateTo = (item: ToolsMenuItem) => {
        if (item === ToolsMenuItem.TotalSpend) {
            setActiveView(SummaryView.TotalSpendByPerson)
        }
        const summaryView = ToolsMenuItemMap.get(item)?.summaryView
        if (summaryView) setActiveView(summaryView)
        setActiveItem(item)
        setOpenPanel(null)
    }

    // Register sort resets
    const sortDateReset = useSortDateStore((s) => s.reset)
    const sortCostReset = useSortCostStore((s) => s.reset)
    const sortItemNameReset = useSortItemNameStore((s) => s.reset)
    useEffect(() => {
        sortStoreResets.add(sortDateReset)
        sortStoreResets.add(sortCostReset)
        sortStoreResets.add(sortItemNameReset)
    }, [sortDateReset, sortCostReset, sortItemNameReset])

    const [openPanel, setOpenPanel] = useState<Panel>(null)
    const [searchOpen, setSearchOpen] = useState(false)
    const searchInputRef = useRef<HTMLInputElement>(null)

    // Only subscribe to isActive booleans for receipts view badge indicators
    const filterPaidByActive = useFilterPaidByStore((s) => s.isActive())
    const filterSplitActive = useFilterSplitBetweenStore((s) => s.isActive())
    const filterSpendTypeActive = useFilterSpendTypeStore((s) => s.isActive())
    const filterLocationActive = useFilterLocationStore((s) => s.isActive())
    const filterAnyActive =
        filterPaidByActive ||
        filterSplitActive ||
        filterSpendTypeActive ||
        filterLocationActive

    const sortDateOrder = useSortDateStore((s) => s.order)
    const sortCostOrder = useSortCostStore((s) => s.order)
    const sortNameOrder = useSortItemNameStore((s) => s.order)
    const sortActive = sortDateOrder !== 0 || sortCostOrder !== 0 || sortNameOrder !== 0
    const searchInput = useSearchBarStore((s) => s.searchInput)
    const setSearchInput = useSearchBarStore((s) => s.setSearchInput)
    const collapseToggle = useCollapseAllStore((s) => s.toggle)

    const anyActive = filterAnyActive || sortActive || searchInput !== ''

    // Close panels when navigating away from Receipts
    useEffect(() => {
        if (!isReceiptsActive) {
            setOpenPanel(null)
            setSearchOpen(false)
        }
    }, [isReceiptsActive])

    useEffect(() => {
        if (searchOpen) {
            setTimeout(() => searchInputRef.current?.focus(), 320)
        }
    }, [searchOpen])

    const handleResetAll = () => {
        useFilterSplitBetweenStore.getState().reset(participantNames)
        useFilterPaidByStore.getState().reset(participantNames)
        useFilterSpendTypeStore.getState().reset(categoryNames)
        useFilterLocationStore.getState().reset(locationNames)
        useSortDateStore.getState().reset()
        useSortCostStore.getState().reset()
        useSortItemNameStore.getState().reset()
        useSortMenuStore.getState().setActive(false)
        useSearchBarStore.getState().reset()
        setOpenPanel(null)
        setSearchOpen(false)
    }

    const togglePanel = (panel: Panel) => {
        setOpenPanel((prev) => (prev === panel ? null : panel))
        setSearchOpen(false)
    }

    // Current view label for the nav button
    const activeLabel = isSummaryActive
        ? 'Charts'
        : (ToolsMenuItemMap.get(activeItem)?.label ?? 'Menu')

    return (
        <ClickAwayListener
            onClickAway={() => {
                setOpenPanel(null)
                setSearchOpen(false)
            }}>
            <Box
                onClick={() => {
                    if (searchOpen) setSearchOpen(false)
                }}
                sx={{
                    position: 'sticky',
                    top: 0,
                    paddingY: 1,
                    zIndex: 4,
                    backgroundColor: colors.secondaryYellow,
                }}>
                <Box sx={{ position: 'relative' }}>
                    {/* ── Toolbar row ── */}
                    <Box
                        sx={{
                            height: TOOLBAR_HEIGHT,
                            display: 'flex',
                            alignItems: 'center',
                            paddingX: 3,
                            position: 'relative',
                            zIndex: 2,
                        }}>
                        {/* Buttons — fade out when search opens */}
                        <Box
                            sx={{
                                display: 'flex',
                                alignItems: 'center',
                                alignSelf: 'stretch',
                                gap: 0.5,
                                flex: 1,
                                opacity: searchOpen ? 0 : 1,
                                pointerEvents: searchOpen ? 'none' : 'auto',
                                transition: 'opacity 0.18s ease-out',
                            }}>
                            {/* Nav button — shows current view, opens view picker */}
                            <Box
                                onClick={() => togglePanel('nav')}
                                sx={{
                                    'display': 'flex',
                                    'alignItems': 'center',
                                    'gap': 0.5,
                                    'paddingX': 1,
                                    'paddingY': 0.5,
                                    'borderRadius': '6px',
                                    'cursor': 'pointer',
                                    'backgroundColor':
                                        openPanel === 'nav'
                                            ? `${colors.primaryBlack}0a`
                                            : 'transparent',
                                    'transition': 'background-color 0.15s',
                                    '&:active': { opacity: 0.55 },
                                }}>
                                {getToolsMenuItemIcon(
                                    isSummaryActive
                                        ? ToolsMenuItem.TotalSpend
                                        : activeItem,
                                    17
                                )}
                                <Typography
                                    sx={{
                                        fontSize: 13,
                                        fontWeight: 600,
                                        lineHeight: 1,
                                        color: colors.primaryBlack,
                                    }}>
                                    {activeLabel}
                                </Typography>
                                <IconDotsVertical
                                    size={14}
                                    color={colors.primaryBlack}
                                    style={{ opacity: 0.4 }}
                                />
                            </Box>

                            {/* Summary sub-nav chips (inline, only when Charts active) */}
                            {isSummaryActive && (
                                <Box
                                    sx={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 0.25,
                                        marginLeft: 0.5,
                                    }}>
                                    {[
                                        ToolsMenuItem.TotalSpendByPerson,
                                        ToolsMenuItem.TotalSpendByType,
                                        ToolsMenuItem.TotalSpendByLocation,
                                        ToolsMenuItem.TotalSpendByDate,
                                    ].map((item) => {
                                        const data = ToolsMenuItemMap.get(item)!
                                        const isActive =
                                            activeItem === item ||
                                            (activeItem ===
                                                ToolsMenuItem.TotalSpend &&
                                                item ===
                                                    ToolsMenuItem.TotalSpendByPerson)
                                        return (
                                            <Box
                                                key={item}
                                                onClick={() => navigateTo(item)}
                                                sx={{
                                                    'paddingX': 0.75,
                                                    'paddingY': 0.25,
                                                    'borderRadius': '4px',
                                                    'cursor': 'pointer',
                                                    'backgroundColor': isActive
                                                        ? colors.primaryBlack
                                                        : 'transparent',
                                                    'transition':
                                                        'background-color 0.15s',
                                                    '&:active': {
                                                        opacity: 0.7,
                                                    },
                                                }}>
                                                <Typography
                                                    sx={{
                                                        fontSize: 10,
                                                        fontWeight: isActive
                                                            ? 700
                                                            : 400,
                                                        lineHeight: 1,
                                                        color: isActive
                                                            ? colors.primaryWhite
                                                            : colors.primaryBlack,
                                                        opacity: isActive
                                                            ? 1
                                                            : 0.55,
                                                    }}>
                                                    {data.label}
                                                </Typography>
                                            </Box>
                                        )
                                    })}
                                </Box>
                            )}

                            {/* Receipts-specific buttons */}
                            {isReceiptsActive && (
                                <>
                                    <ToolbarButton
                                        icon={<IconSearch size={17} />}
                                        active={searchInput !== ''}
                                        onClick={() => {
                                            setSearchOpen(true)
                                            setOpenPanel(null)
                                        }}
                                    />
                                    <TabButton
                                        icon={<IconFilter size={17} />}
                                        label="Filter"
                                        active={filterAnyActive}
                                        pressed={openPanel === 'filter'}
                                        onClick={() => togglePanel('filter')}
                                    />
                                    <TabButton
                                        icon={
                                            <IconSortAscending size={17} />
                                        }
                                        label="Sort"
                                        active={sortActive}
                                        pressed={openPanel === 'sort'}
                                        onClick={() => togglePanel('sort')}
                                    />
                                    <ToolbarButton
                                        icon={
                                            <IconLayoutNavbarCollapse
                                                size={17}
                                            />
                                        }
                                        onClick={() => {
                                            const sc = document.getElementById('main-scroll')
                                            if (sc && sc.scrollTop > 0) {
                                                const start = sc.scrollTop
                                                const startTime = performance.now()
                                                const duration = 300
                                                const animate = (now: number) => {
                                                    const t = Math.min((now - startTime) / duration, 1)
                                                    const ease = 1 - Math.pow(1 - t, 3)
                                                    sc.scrollTop = start * (1 - ease)
                                                    if (t < 1) requestAnimationFrame(animate)
                                                }
                                                requestAnimationFrame(animate)
                                            }
                                            collapseToggle()
                                        }}
                                    />
                                    {anyActive && (
                                        <Box sx={{ marginLeft: 'auto' }}>
                                            <ToolbarButton
                                                icon={
                                                    <IconRefresh size={17} />
                                                }
                                                onClick={handleResetAll}
                                            />
                                        </Box>
                                    )}
                                </>
                            )}
                        </Box>

                        {/* Search overlay */}
                        {isReceiptsActive && (
                            <Box
                                sx={{
                                    position: 'absolute',
                                    left: '24px',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    height: '34px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    width: searchOpen
                                        ? 'calc(100% - 48px)'
                                        : '34px',
                                    opacity: searchOpen ? 1 : 0,
                                    border: searchOpen
                                        ? `1px solid ${colors.primaryBlack}`
                                        : '1px solid transparent',
                                    borderRadius: '6px',
                                    backgroundColor: searchOpen
                                        ? colors.primaryWhite
                                        : 'transparent',
                                    overflow: 'hidden',
                                    pointerEvents: searchOpen
                                        ? 'auto'
                                        : 'none',
                                    transition: [
                                        `opacity ${searchOpen ? '0.06s' : '0.08s 0.15s'} ease-out`,
                                        `border-color ${searchOpen ? '0.06s' : '0.08s 0.15s'} ease-out`,
                                        `background-color ${searchOpen ? '0.06s' : '0.08s 0.15s'} ease-out`,
                                        `width ${searchOpen ? '0.25s 0.06s' : '0.2s'} ease-out`,
                                    ].join(', '),
                                }}>
                                <Box
                                    sx={{
                                        width: 34,
                                        height: 34,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        flexShrink: 0,
                                    }}>
                                    <IconSearch
                                        size={15}
                                        color={colors.primaryBlack}
                                    />
                                </Box>
                                <TextField
                                    inputRef={searchInputRef}
                                    value={searchInput}
                                    onClick={(e) => e.stopPropagation()}
                                    onChange={(e) =>
                                        setSearchInput(e.target.value)
                                    }
                                    size="small"
                                    placeholder="Search expenses…"
                                    slotProps={{
                                        input: {
                                            endAdornment: searchInput ? (
                                                <InputAdornment
                                                    position="end"
                                                    sx={{
                                                        cursor: 'pointer',
                                                    }}
                                                    onClick={() =>
                                                        setSearchInput('')
                                                    }>
                                                    <IconX
                                                        size={14}
                                                        color={
                                                            colors.primaryBlack
                                                        }
                                                    />
                                                </InputAdornment>
                                            ) : null,
                                        },
                                    }}
                                    sx={{
                                        flex: 1,
                                        '& .MuiOutlinedInput-root': {
                                            height: 28,
                                            borderRadius: '4px',
                                            fontSize: 13,
                                            backgroundColor: 'transparent',
                                            '& fieldset': {
                                                border: 'none',
                                            },
                                        },
                                        '& .MuiInputBase-input': {
                                            paddingY: 0,
                                            paddingX: 0.5,
                                        },
                                    }}
                                />
                            </Box>
                        )}

                    </Box>

                    {/* ── Panels — absolute, overlays content ── */}

                    {/* Nav panel */}
                    <Box
                        sx={{
                            position: 'absolute',
                            top: TOOLBAR_HEIGHT,
                            left: 0,
                            right: 0,
                            zIndex: 1,
                            maxHeight: openPanel === 'nav' ? '400px' : 0,
                            opacity: openPanel === 'nav' ? 1 : 0,
                            overflow: 'hidden',
                            transition:
                                'max-height 0.25s ease-out, opacity 0.18s ease-out',
                            pointerEvents:
                                openPanel === 'nav' ? 'auto' : 'none',
                        }}>
                        {openPanel === 'nav' && (
                            <Box
                                sx={{
                                    marginX: 3,
                                    border: `1px solid ${PANEL_BORDER}`,
                                    borderRadius: '0 0 8px 8px',
                                    backgroundColor: colors.primaryWhite,
                                    padding: 1,
                                }}>
                                {[
                                    ToolsMenuItem.Receipts,
                                    ToolsMenuItem.DebtCalculator,
                                    ToolsMenuItem.TotalSpend,
                                    ToolsMenuItem.Links,
                                ].map((item) => {
                                    const data = ToolsMenuItemMap.get(item)!
                                    const isActive =
                                        item === ToolsMenuItem.TotalSpend
                                            ? isSummaryActive
                                            : activeItem === item
                                    return (
                                        <Box
                                            key={item}
                                            onClick={() => navigateTo(item)}
                                            sx={{
                                                'display': 'flex',
                                                'alignItems': 'center',
                                                'gap': 1.5,
                                                'paddingX': 1.5,
                                                'paddingY': 1,
                                                'borderRadius': '6px',
                                                'cursor': 'pointer',
                                                'backgroundColor': isActive
                                                    ? `${colors.primaryBlack}08`
                                                    : 'transparent',
                                                '&:active': {
                                                    backgroundColor: `${colors.primaryBlack}12`,
                                                },
                                            }}>
                                            <Box
                                                sx={{
                                                    display: 'flex',
                                                    opacity: isActive
                                                        ? 1
                                                        : 0.5,
                                                }}>
                                                {getToolsMenuItemIcon(
                                                    item,
                                                    18
                                                )}
                                            </Box>
                                            <Typography
                                                sx={{
                                                    fontSize: 13,
                                                    fontWeight: isActive
                                                        ? 700
                                                        : 400,
                                                    color: colors.primaryBlack,
                                                }}>
                                                {item ===
                                                ToolsMenuItem.TotalSpend
                                                    ? 'Charts'
                                                    : data.label}
                                            </Typography>
                                        </Box>
                                    )
                                })}
                            </Box>
                        )}
                    </Box>

                    {/* Filter / Sort panel */}
                    {isReceiptsActive && (
                        <Box
                            sx={{
                                position: 'absolute',
                                top: TOOLBAR_HEIGHT,
                                left: 0,
                                right: 0,
                                zIndex: 1,
                                display:
                                    openPanel === 'filter' ||
                                    openPanel === 'sort'
                                        ? 'block'
                                        : 'none',
                            }}>
                            {(openPanel === 'filter' ||
                                openPanel === 'sort') && (
                                <Box
                                    sx={{
                                        marginX: 3,
                                        borderLeft: `1px solid ${PANEL_BORDER}`,
                                        borderRight: `1px solid ${PANEL_BORDER}`,
                                        borderBottom: `1px solid ${PANEL_BORDER}`,
                                        borderTop: `1px solid ${PANEL_BORDER}`,
                                        borderRadius: '4px',
                                        backgroundColor: colors.primaryWhite,
                                        padding: 2,
                                        paddingTop: 1.5,
                                    }}>
                                    {openPanel === 'filter' && (
                                        <FilterPanel
                                            participantNames={participantNames}
                                            categoryNames={categoryNames}
                                            locationNames={locationNames}
                                            onReset={() => {
                                                useFilterSplitBetweenStore
                                                    .getState()
                                                    .reset(participantNames)
                                                useFilterPaidByStore
                                                    .getState()
                                                    .reset(participantNames)
                                                useFilterSpendTypeStore
                                                    .getState()
                                                    .reset(categoryNames)
                                                useFilterLocationStore
                                                    .getState()
                                                    .reset(locationNames)
                                            }}
                                        />
                                    )}
                                    {openPanel === 'sort' && (
                                        <SortPanel
                                            onReset={() => {
                                                useSortDateStore
                                                    .getState()
                                                    .reset()
                                                useSortCostStore
                                                    .getState()
                                                    .reset()
                                                useSortItemNameStore
                                                    .getState()
                                                    .reset()
                                                useSortMenuStore
                                                    .getState()
                                                    .setActive(false)
                                            }}
                                        />
                                    )}
                                </Box>
                            )}
                        </Box>
                    )}
                </Box>
            </Box>
        </ClickAwayListener>
    )
}

// ─── Toolbar button (icon-only) ───────────────────────────────────────────────

type ToolbarButtonProps = {
    icon: React.ReactNode
    active?: boolean
    onClick: () => void
}

const ToolbarButton = ({ icon, active, onClick }: ToolbarButtonProps) => (
    <Box
        onClick={onClick}
        sx={{
            'position': 'relative',
            'display': 'flex',
            'alignItems': 'center',
            'justifyContent': 'center',
            'width': 34,
            'height': 34,
            'borderRadius': '6px',
            'cursor': 'pointer',
            'flexShrink': 0,
            '&:active': { opacity: 0.55 },
        }}>
        {icon}
        {active && (
            <Box
                sx={{
                    position: 'absolute',
                    top: 6,
                    right: 4,
                    width: 5,
                    height: 5,
                    borderRadius: '50%',
                    backgroundColor: colors.primaryRed,
                }}
            />
        )}
    </Box>
)

// ─── Tab button (Filter / Sort) ───────────────────────────────────────────────

type TabButtonProps = {
    icon: React.ReactNode
    label: string
    active?: boolean
    pressed: boolean
    onClick: () => void
}

const TabButton = ({
    icon,
    label,
    active,
    pressed,
    onClick,
}: TabButtonProps) => (
    <Box
        onClick={onClick}
        sx={{
            'position': 'relative',
            'display': 'flex',
            'alignItems': 'center',
            'gap': 0.5,
            'paddingX': 1.25,
            'alignSelf': 'stretch',
            'marginBottom': pressed ? '-2px' : 0,
            'borderRadius': pressed ? '6px 6px 0 0' : '6px',
            'border': pressed
                ? `1px solid ${PANEL_BORDER}`
                : '1px solid transparent',
            'borderBottom': pressed
                ? `2px solid ${colors.primaryWhite}`
                : '1px solid transparent',
            'backgroundColor': pressed
                ? colors.primaryWhite
                : 'transparent',
            'cursor': 'pointer',
            'flexShrink': 0,
            '&:active': { opacity: 0.55 },
        }}>
        {icon}
        <Typography
            sx={{
                fontSize: 13,
                fontWeight: pressed || active ? 600 : 500,
                lineHeight: 1,
                color: colors.primaryBlack,
            }}>
            {label}
        </Typography>
        {/* Active dot — absolutely positioned to avoid layout shift */}
        <Box
            sx={{
                position: 'absolute',
                top: 6,
                right: 4,
                width: 5,
                height: 5,
                borderRadius: '50%',
                backgroundColor: colors.primaryRed,
                opacity: active ? 1 : 0,
                transition: 'opacity 0.1s',
            }}
        />
    </Box>
)

// ─── Filter panel ─────────────────────────────────────────────────────────────

type FilterPanelProps = {
    participantNames: string[]
    categoryNames: string[]
    locationNames: string[]
    onReset: () => void
}

const FilterPanel = memo(function FilterPanel({
    participantNames,
    categoryNames,
    locationNames,
    onReset,
}: FilterPanelProps) {
    const splitFilters = useFilterSplitBetweenStore((s) => s.filters)
    const splitClick = useFilterSplitBetweenStore((s) => s.handleFilterClick)
    const paidByFilters = useFilterPaidByStore((s) => s.filters)
    const paidByClick = useFilterPaidByStore((s) => s.handleFilterClick)
    const spendTypeFilters = useFilterSpendTypeStore((s) => s.filters)
    const spendTypeClick = useFilterSpendTypeStore((s) => s.handleFilterClick)
    const locationFilters = useFilterLocationStore((s) => s.filters)
    const locationClick = useFilterLocationStore((s) => s.handleFilterClick)

    return (
        <>
            <PanelHeader label="Filters" onReset={onReset} />

            {participantNames.length > 0 && (
                <FilterRow label="Split between">
                    {Array.from(splitFilters.entries()).map(
                        ([name, active]) => (
                            <Box
                                key={name}
                                onClick={() => splitClick(name)}
                                sx={{ cursor: 'pointer' }}>
                                <InitialsIcon
                                    name={name}
                                    sx={{
                                        width: 32,
                                        height: 32,
                                        fontSize: 10,
                                        outline: active
                                            ? `2px solid ${colors.primaryBlack}`
                                            : '2px solid transparent',
                                        outlineOffset: '1px',
                                        opacity: active ? 1 : 0.4,
                                        transition:
                                            'outline-color 0.1s, opacity 0.1s',
                                    }}
                                />
                            </Box>
                        )
                    )}
                </FilterRow>
            )}

            {participantNames.length > 0 && (
                <FilterRow label="Paid by">
                    {Array.from(paidByFilters.entries()).map(
                        ([name, active]) => (
                            <Box
                                key={name}
                                onClick={() => paidByClick(name)}
                                sx={{ cursor: 'pointer' }}>
                                <InitialsIcon
                                    name={name}
                                    sx={{
                                        width: 32,
                                        height: 32,
                                        fontSize: 10,
                                        outline: active
                                            ? `2px solid ${colors.primaryBlack}`
                                            : '2px solid transparent',
                                        outlineOffset: '1px',
                                        opacity: active ? 1 : 0.4,
                                        transition:
                                            'outline-color 0.1s, opacity 0.1s',
                                    }}
                                />
                            </Box>
                        )
                    )}
                </FilterRow>
            )}

            {categoryNames.length > 0 && (
                <FilterRow label="Category">
                    {Array.from(spendTypeFilters.entries()).map(
                        ([cat, active]) => (
                            <Box
                                key={cat}
                                onClick={() => spendTypeClick(cat)}
                                sx={{
                                    cursor: 'pointer',
                                    width: 32,
                                    height: 32,
                                    borderRadius: '50%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    backgroundColor: active
                                        ? getColorForCategory(cat)
                                        : colors.secondaryYellow,
                                    outline: active
                                        ? `2px solid ${colors.primaryBlack}`
                                        : '2px solid transparent',
                                    outlineOffset: '1px',
                                    opacity: active ? 1 : 0.5,
                                    transition:
                                        'background-color 0.1s, outline-color 0.1s, opacity 0.1s',
                                }}>
                                {getIconFromCategory(cat, 17)}
                            </Box>
                        )
                    )}
                </FilterRow>
            )}

            {locationNames.length > 0 && locationFilters.size > 0 && (
                <FilterRow label="Location">
                    {Array.from(locationFilters.entries()).map(
                        ([loc, active]) => (
                            <Box
                                key={loc}
                                onClick={() => locationClick(loc)}
                                sx={{ cursor: 'pointer' }}>
                                <LocationIcon
                                    location={loc}
                                    sx={{
                                        width: 32,
                                        height: 32,
                                        fontSize: 10,
                                        outline: active
                                            ? `2px solid ${colors.primaryBlack}`
                                            : '2px solid transparent',
                                        outlineOffset: '1px',
                                        opacity: active ? 1 : 0.4,
                                        transition:
                                            'outline-color 0.1s, opacity 0.1s',
                                    }}
                                />
                            </Box>
                        )
                    )}
                </FilterRow>
            )}
        </>
    )
})

// ─── Sort panel ───────────────────────────────────────────────────────────────

const sortOptionIcons: Record<string, React.ReactNode> = {
    Date: <IconCalendarEvent size={14} />,
    Cost: <IconCurrencyDollar size={14} />,
    Name: <IconSortAZ size={14} />,
}

const SortPanel = memo(function SortPanel({
    onReset,
}: {
    onReset: () => void
}) {
    const {
        order: dateOrder,
        toggleSortOrder: toggleDate,
        getSortOrderIcon: getDateIcon,
    } = useSortDateStore(useShallow((s) => s))
    const {
        order: costOrder,
        toggleSortOrder: toggleCost,
        getSortOrderIcon: getCostIcon,
    } = useSortCostStore(useShallow((s) => s))
    const {
        order: nameOrder,
        toggleSortOrder: toggleName,
        getSortOrderIcon: getNameIcon,
    } = useSortItemNameStore(useShallow((s) => s))

    const sortOptions = [
        {
            label: 'Date',
            toggle: toggleDate,
            dirIcon: getDateIcon(13),
            active: dateOrder !== 0,
        },
        {
            label: 'Cost',
            toggle: toggleCost,
            dirIcon: getCostIcon(13),
            active: costOrder !== 0,
        },
        {
            label: 'Name',
            toggle: toggleName,
            dirIcon: getNameIcon(13),
            active: nameOrder !== 0,
        },
    ]

    return (
        <>
            <PanelHeader label="Sort" onReset={onReset} />
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {sortOptions.map(({ label, toggle, dirIcon, active }) => (
                    <Box
                        key={label}
                        onClick={toggle}
                        sx={{
                            'display': 'flex',
                            'alignItems': 'center',
                            'gap': 0.75,
                            'paddingX': 1.5,
                            'paddingY': 0.75,
                            'borderRadius': '6px',
                            'border': `1px solid ${active ? colors.primaryBlack : `${colors.primaryBlack}60`}`,
                            'backgroundColor': active
                                ? colors.primaryYellow
                                : 'transparent',
                            'cursor': 'pointer',
                            '&:active': { opacity: 0.6 },
                            'transition':
                                'background-color 0.1s, border-color 0.1s',
                        }}>
                        {sortOptionIcons[label]}
                        <Typography
                            sx={{
                                fontSize: 13,
                                fontWeight: active ? 600 : 400,
                                lineHeight: 1,
                            }}>
                            {label}
                        </Typography>
                        {dirIcon}
                    </Box>
                ))}
            </Box>
        </>
    )
})

// ─── Shared sub-components ────────────────────────────────────────────────────

const PanelHeader = ({
    label,
    onReset,
}: {
    label: string
    onReset: () => void
}) => (
    <Box
        sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 1.5,
        }}>
        <Typography
            sx={{
                fontSize: 10,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                color: colors.primaryBlack,
            }}>
            {label}
        </Typography>
        <Box
            onClick={onReset}
            sx={{
                'display': 'flex',
                'alignItems': 'center',
                'gap': 0.5,
                'cursor': 'pointer',
                'color': colors.primaryBlack,
                'padding': '2px 6px',
                'borderRadius': '4px',
                '&:active': { opacity: 0.25 },
                'transition': 'opacity 0.1s',
            }}>
            <IconRefresh size={12} />
            <Typography sx={{ fontSize: 11 }}>Reset</Typography>
        </Box>
    </Box>
)

const FilterRow = ({
    label,
    children,
}: {
    label: string
    children: React.ReactNode
}) => (
    <Box
        sx={{
            display: 'flex',
            flexDirection: 'column',
            gap: 1,
            marginBottom: 1.5,
        }}>
        <Typography
            sx={{
                fontSize: 10,
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                color: colors.primaryBlack,
            }}>
            {label}
        </Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {children}
        </Box>
    </Box>
)
