import { Box, Typography } from '@mui/material'
import { create } from 'zustand'
import { useShallow } from 'zustand/react/shallow'

import { useSettingsIconLabelsStore } from 'components/menu/settings/settings-icon-labels'
import { useEffect } from 'react'
import { getTablerIcon, LocationIcon } from 'utils/icons'

type FilterLocationState = {
    filters: Map<string, boolean> // locationName → boolean
}

type FilterLocationActions = {
    handleFilterClick: (location: string) => void
    isActive: () => boolean
    setFilters: (filters: Map<string, boolean>) => void
    reset: (locationNames: string[]) => void
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
}))

export const FilterLocation = ({
    locationNames,
}: {
    locationNames: string[]
}) => {
    const { filters, handleFilterClick, reset } = useFilterLocationStore(
        useShallow((state) => state)
    )

    useEffect(() => {
        reset(locationNames)
    }, [])

    const { showIconLabels } = useSettingsIconLabelsStore(
        useShallow((state) => state)
    )

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
                {showIconLabels && (
                    <Typography sx={{ fontSize: '10px' }}>Clear</Typography>
                )}
            </Box>
            <Box
                sx={{
                    display: 'flex',
                    justifyContent: 'space-evenly',
                    alignItems: 'center',
                    width: '100%',
                }}>
                {Array.from(filters.entries()).map(([location, isActive]) => {
                    return (
                        <Box
                            key={'filter-location-' + location}
                            sx={{
                                display: 'flex',
                                justifyContent: 'center',
                                alignItems: 'center',
                            }}
                            onClick={() => {
                                handleFilterClick(location)
                            }}>
                            <Box
                                sx={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                }}>
                                <Box
                                    sx={{
                                        display: 'flex',
                                        justifyContent: 'center',
                                        alignItems: 'center',
                                        borderRadius: '100%',
                                        transition: 'background-color 0.1s',
                                    }}>
                                    <LocationIcon
                                        location={location}
                                        sx={
                                            !isActive
                                                ? {
                                                      backgroundColor:
                                                          'lightgray',
                                                  }
                                                : undefined
                                        }
                                    />
                                </Box>
                                {showIconLabels && (
                                    <Typography sx={{ fontSize: '10px' }}>
                                        {location}
                                    </Typography>
                                )}
                            </Box>
                        </Box>
                    )
                })}
            </Box>
        </Box>
    )
}
