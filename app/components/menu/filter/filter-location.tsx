import { Box } from '@mui/material'
import { create } from 'zustand'
import { useShallow } from 'zustand/react/shallow'

import { colors } from '@/lib/colors'
import { useEffect, useRef } from 'react'
import { getTablerIcon } from 'utils/icons'

type FilterLocationState = {
    filters: Map<string, boolean> // locationName → boolean
}

type FilterLocationActions = {
    handleFilterClick: (location: string) => void
    isActive: () => boolean
    setFilters: (filters: Map<string, boolean>) => void
    reset: (locationNames: string[]) => void
    sync: (locationNames: string[]) => void
}

const initialState: FilterLocationState = {
    filters: new Map<string, boolean>(),
}

const filtersFromNames = (names: string[]) => {
    const filters = new Map<string, boolean>()
    names.forEach((name) => filters.set(name, false))
    return filters
}

export const useFilterLocationStore = create<
    FilterLocationState & FilterLocationActions
>()((set, get) => ({
    ...initialState,

    handleFilterClick: (location: string) => {
        const { filters } = get()
        const newFilters = new Map(filters)
        newFilters.set(location, !newFilters.get(location))
        set(() => ({ filters: newFilters }))
    },

    isActive: () => {
        const { filters } = get()
        return Array.from(filters.values()).includes(true)
    },
    setFilters: (filters: Map<string, boolean>) => set(() => ({ filters })),
    reset: (locationNames: string[]) => {
        set(() => ({ filters: filtersFromNames(locationNames) }))
    },
    sync: (locationNames: string[]) => {
        const { filters } = get()
        const nameSet = new Set(locationNames)
        const newFilters = new Map<string, boolean>()
        // Keep existing selections for locations that still exist
        for (const name of locationNames) {
            newFilters.set(name, filters.get(name) ?? false)
        }
        // Only update if the set of keys actually changed
        if (newFilters.size !== filters.size || Array.from(nameSet).some((n) => !filters.has(n))) {
            set(() => ({ filters: newFilters }))
        }
    },
}))

export const FilterLocation = ({
    locationNames,
}: {
    locationNames: string[]
}) => {
    const { filters, handleFilterClick, reset, sync } = useFilterLocationStore(
        useShallow((state) => state)
    )

    // Initial mount: reset all filters. Subsequent updates: sync (preserve selections).
    const isInitialMount = useRef(true)
    useEffect(() => {
        if (isInitialMount.current) {
            reset(locationNames)
            isInitialMount.current = false
        } else {
            sync(locationNames)
        }
    }, [locationNames])

    return (
        <Box
            sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginX: 2,
                width: '100%',
            }}>
            <Box
                sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    marginRight: 2,
                }}>
                <Box
                    sx={{
                        'display': 'flex',
                        'justifyContent': 'center',
                        'alignItems': 'center',
                        'borderRadius': '100%',
                        '&:active': {
                            backgroundColor: '#FBBC04',
                        },
                        'transition': 'background-color 0.1s',
                    }}
                    onClick={() => {
                        reset(locationNames)
                    }}>
                    {getTablerIcon({ name: 'IconX' })}
                </Box>
            </Box>
            <Box
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.5,
                    overflowX: 'auto',
                    width: '100%',
                    paddingY: 0.5,
                    // Hide scrollbar but keep scrollable
                    scrollbarWidth: 'none',
                    '&::-webkit-scrollbar': { display: 'none' },
                }}>
                {Array.from(filters.entries()).map(([location, isActive]) => {
                    return (
                        <Box
                            key={'filter-location-' + location}
                            sx={{
                                cursor: 'pointer',
                                flexShrink: 0,
                                paddingX: 1.5,
                                paddingY: 0.5,
                                fontSize: 12,
                                fontWeight: isActive ? 600 : 500,
                                borderRadius: '4px',
                                border: `1px solid ${colors.primaryBlack}`,
                                boxShadow: isActive
                                    ? `2px 2px 0px ${colors.primaryBlack}`
                                    : 'none',
                                backgroundColor: isActive
                                    ? colors.primaryYellow
                                    : colors.primaryWhite,
                                color: colors.primaryBlack,
                                opacity: isActive ? 1 : 0.5,
                                transition:
                                    'opacity 0.1s, box-shadow 0.1s, background-color 0.1s',
                                whiteSpace: 'nowrap',
                            }}
                            onClick={() => {
                                handleFilterClick(location)
                            }}>
                            {location}
                        </Box>
                    )
                })}
            </Box>
        </Box>
    )
}
