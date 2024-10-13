import { Box, Typography } from '@mui/material'
import { useSettingsIconLabelsStore } from 'components/menu/settings/settings-icon-labels'
import { getTablerIcon, LocationIcon } from 'helpers/icons'
import { Location } from 'helpers/location'
import { Spend } from 'helpers/spend'
import { useEffect } from 'react'
import { create } from 'zustand'
import { useShallow } from 'zustand/react/shallow'

type FilterLocationState = {
    all: boolean
    filters: Record<Location, boolean>
}

type FilterLocationActions = {
    filter: (spendData: Spend[]) => Spend[]
    isActive: () => boolean

    setAll: (all: boolean) => void
    setFilters: (filters: Record<Location, boolean>) => void
    reset: () => void
}

const initialState: FilterLocationState = {
    all: true,
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
            const { all, filters } = get()

            if (all) {
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

        isActive: () => {
            const { all } = get()
            return !all
        },

        setAll: (all: boolean) => set(() => ({ all })),
        setFilters: (filters: Record<Location, boolean>) => set(() => ({ filters })),
        reset: () => set(initialState),
    })
)

export const FilterLocation = () => {
    const { all, filters, setAll, setFilters } = useFilterLocationStore(
        useShallow((state) => state)
    )

    useEffect(() => {
        if (Object.values(filters).every((filter) => !filter)) {
            setAll(true)
        } else {
            setAll(false)
        }
    }, [filters])

    const handleAllClick = () => {
        if (!all) {
            setAll(true)
            setFilters(
                Object.keys(filters).reduce((acc, key) => {
                    acc[key as Location] = false
                    return acc
                }, {} as Record<Location, boolean>)
            )
        }
    }

    const updateFilters = (location: Location) => {
        setFilters({
            ...filters,
            [location]: !filters[location],
        })
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
                        handleAllClick()
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
                            updateFilters(location as Location)
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
