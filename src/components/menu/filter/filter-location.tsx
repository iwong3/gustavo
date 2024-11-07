import { Box, Typography } from '@mui/material'
import { create } from 'zustand'
import { useShallow } from 'zustand/react/shallow'

import { useSettingsIconLabelsStore } from 'components/menu/settings/settings-icon-labels'
import { getTablerIcon, LocationIcon } from 'helpers/icons'
import { Location, LocationByTrip } from 'helpers/location'
import { Spend } from 'helpers/spend'
import { Trip } from 'helpers/trips'
import { useEffect } from 'react'
import { useTripsStore } from 'views/trips'

type FilterLocationState = {
    filters: Map<Location, boolean>
}

type FilterLocationActions = {
    filter: (spendData: Spend[]) => Spend[]
    handleFilterClick: (location: Location) => void

    isActive: () => boolean
    setFilters: (filters: Map<Location, boolean>) => void
    reset: (trip: Trip) => void
}

const initialState: FilterLocationState = {
    filters: new Map<Location, boolean>(),
}

const getInitialStateByTrip = (trip: Trip) => {
    const filters = new Map<Location, boolean>()
    LocationByTrip[trip].forEach((location) => {
        filters.set(location, false)
    })
    return filters
}

export const useFilterLocationStore = create<
    FilterLocationState & FilterLocationActions
>()((set, get) => ({
    ...initialState,

    filter: (spendData: Spend[]): Spend[] => {
        const { filters } = get()

        const isAnyFilterActive = Array.from(filters.values()).includes(true)
        if (!isAnyFilterActive) {
            return spendData
        }

        const filteredSpendData = spendData.filter((spend) => {
            // If location isn't a location defined for the trip or is undefined,
            // show it in the 'Other' category
            if (spend.location === undefined) {
                return filters.get(Location.Other)
            }
            if (!LocationByTrip[spend.trip].includes(spend.location)) {
                return filters.get(Location.Other)
            }

            return filters.get(spend.location)
        })
        return filteredSpendData
    },
    handleFilterClick: (location: Location) => {
        const { filters } = get()

        const newFilters = new Map(filters)
        newFilters.set(location, !newFilters.get(location))
        set(() => ({
            filters: newFilters,
        }))
    },

    isActive: () => {
        const { filters } = get()
        const isAnyFilterActive = Array.from(filters.values()).includes(true)
        return isAnyFilterActive
    },
    setFilters: (filters: Map<Location, boolean>) => set(() => ({ filters })),
    reset: (trip: Trip) => {
        set(() => ({
            filters: getInitialStateByTrip(trip),
        }))
    },
}))

export const FilterLocation = () => {
    const { filters, handleFilterClick, reset } = useFilterLocationStore(
        useShallow((state) => state)
    )
    const { currentTrip } = useTripsStore(useShallow((state) => state))

    useEffect(() => {
        reset(currentTrip)
    }, [])

    // settings stores
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
                        reset(currentTrip)
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
