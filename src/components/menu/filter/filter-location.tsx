import { Box, Typography } from '@mui/material'
import { useSettingsIconLabelsStore } from 'components/menu/settings/settings-icon-labels'
import { getTablerIcon, LocationIcon } from 'helpers/icons'
import { Location } from 'helpers/location'
import { Spend } from 'helpers/spend'
import { useEffect } from 'react'
import { create } from 'zustand'
import { useShallow } from 'zustand/react/shallow'

type FilterLocationState = {
    filters: Record<Location, boolean>
}

type FilterLocationActions = {
    filter: (spendData: Spend[]) => Spend[]
    handleFilterClick: (location: Location) => void

    isActive: () => boolean
    setFilters: (filters: Record<Location, boolean>) => void
    reset: () => void
}

const initialState: FilterLocationState = {
    filters: {
        [Location.Hakone]: false,
        [Location.Kyoto]: false,
        [Location.Osaka]: false,
        [Location.Tokyo]: false,
        [Location.Other]: false,
    },
}

export const useFilterLocationStore = create<FilterLocationState & FilterLocationActions>()(
    (set, get) => ({
        ...initialState,

        filter: (spendData: Spend[]): Spend[] => {
            const { filters } = get()

            const isAnyFilterActive = Object.values(filters).some((isActive) => isActive)
            if (!isAnyFilterActive) {
                return spendData
            }

            const filteredSpendData = spendData.filter((spend) => {
                if (spend.location === undefined) {
                    if (filters[Location.Other]) {
                        return true
                    }
                    return false
                }
                return filters[spend.location]
            })
            return filteredSpendData
        },
        handleFilterClick: (location: Location) => {
            const { filters } = get()
            set(() => ({
                filters: {
                    ...filters,
                    [location]: !filters[location],
                },
            }))
        },

        isActive: () => {
            const { filters } = get()
            const isAnyFilterActive = Object.values(filters).some((isActive) => isActive)
            return isAnyFilterActive
        },
        setFilters: (filters: Record<Location, boolean>) => set(() => ({ filters })),
        reset: () => set(initialState),
    })
)

export const FilterLocation = () => {
    const { filters, handleFilterClick, setFilters } = useFilterLocationStore(
        useShallow((state) => state)
    )

    const resetAllFilters = () => {
        setFilters(
            Object.keys(filters).reduce((acc, key) => {
                acc[key as Location] = false
                return acc
            }, {} as Record<Location, boolean>)
        )
    }

    // settings stores
    const { showIconLabels } = useSettingsIconLabelsStore(useShallow((state) => state))

    return (
        <Box
            sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginX: 2,
                width: '100%',
                border: '1px solid white',
                borderBottomWidth: 0,
            }}>
            <Box
                sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
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
                        resetAllFilters()
                    }}>
                    {getTablerIcon({ name: 'IconX' })}
                </Box>
                {showIconLabels && <Typography sx={{ fontSize: '10px' }}>Clear</Typography>}
            </Box>
            {Object.entries(filters).map(([location, isActive]) => {
                return (
                    <Box
                        key={'filter-location-' + location}
                        sx={{
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                        }}
                        onClick={() => {
                            handleFilterClick(location as Location)
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
                                    location={location as Location}
                                    sx={
                                        !isActive
                                            ? { backgroundColor: 'lightgray' }
                                            : { backgroundColor: '#FBBC04' }
                                    }
                                />
                            </Box>
                            {showIconLabels && (
                                <Typography sx={{ fontSize: '10px' }}>{location}</Typography>
                            )}
                        </Box>
                    </Box>
                )
            })}
        </Box>
    )
}
