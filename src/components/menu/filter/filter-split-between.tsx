import { Box, Typography } from '@mui/material'
import { useEffect } from 'react'
import { create } from 'zustand'
import { useShallow } from 'zustand/react/shallow'

import { useSettingsIconLabelsStore } from 'components/menu/settings/settings-icon-labels'
import { useSettingsProfilePicturesStore } from 'components/menu/settings/settings-profile-pictures'
import { getTablerIcon, InitialsIcon } from 'helpers/icons'
import { getPersonImage, PeopleByTrip, Person } from 'helpers/person'
import { Spend } from 'helpers/spend'
import { Trip } from 'helpers/trips'
import { useTripsStore } from 'views/trips'

type FilterSplitBetweenState = {
    filters: Map<Person, boolean>
}

type FilterSplitBetweenActions = {
    filter: (spendData: Spend[]) => Spend[]
    handleFilterClick: (person: Person) => void

    isActive: () => boolean
    setFilters: (filters: Map<Person, boolean>) => void
    reset: (trip: Trip) => void
}

const initialState: FilterSplitBetweenState = {
    filters: new Map<Person, boolean>(),
}

const getInitialStateByTrip = (trip: Trip) => {
    const filters = new Map<Person, boolean>()
    PeopleByTrip[trip].forEach((person) => {
        filters.set(person, false)
    })
    return filters
}

export const useFilterSplitBetweenStore = create<
    FilterSplitBetweenState & FilterSplitBetweenActions
>()((set, get) => ({
    ...initialState,

    filter: (spendData: Spend[]): Spend[] => {
        const { filters } = get()

        const isAnyFilterActive = Array.from(filters.values()).includes(true)
        if (!isAnyFilterActive) {
            return spendData
        }

        const filteredSpendData = spendData.filter((spend) => {
            return spend.splitBetween.some((person) => {
                return person === Person.Everyone || filters.get(person)
            })
        })
        return filteredSpendData
    },
    handleFilterClick: (person: Person) => {
        const { filters } = get()

        const newFilters = new Map(filters)
        newFilters.set(person, !newFilters.get(person))
        set(() => ({
            filters: newFilters,
        }))
    },

    isActive: () => {
        const { filters } = get()
        const isAnyFilterActive = Array.from(filters.values()).includes(true)
        return isAnyFilterActive
    },
    setFilters: (filters: Map<Person, boolean>) => set(() => ({ filters })),
    reset: (trip: Trip) => {
        set(() => ({
            filters: getInitialStateByTrip(trip),
        }))
    },
}))

export const FilterSplitBetween = () => {
    const { filters, handleFilterClick, isActive, setFilters, reset } =
        useFilterSplitBetweenStore(useShallow((state) => state))
    const { currentTrip } = useTripsStore(useShallow((state) => state))

    useEffect(() => {
        if (!isActive()) {
            setFilters(getInitialStateByTrip(currentTrip))
        }
    }, [])

    // Icon settings
    const { showProfilePictures } = useSettingsProfilePicturesStore(
        useShallow((state) => state)
    )
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
                fontSize: '14px',
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
                    justifyContent:
                        currentTrip === Trip.Japan2024
                            ? 'space-between'
                            : 'space-evenly',
                    alignItems: 'center',
                    width: '100%',
                }}>
                {Array.from(filters.entries()).map(([person, isActive]) => {
                    const sx = { fontSize: 10 }

                    return (
                        <Box
                            key={'filter-split-between-' + person}
                            sx={{
                                display: 'flex',
                                justifyContent: 'center',
                                alignItems: 'center',
                                fontSize: '12px',
                            }}
                            onClick={() => {
                                handleFilterClick(person)
                            }}>
                            <Box
                                sx={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                }}>
                                {showProfilePictures &&
                                getPersonImage(person) ? (
                                    <img
                                        src={getPersonImage(person)}
                                        style={{
                                            width: 20,
                                            height: 20,
                                            borderRadius: '100%',
                                            objectFit: 'cover',
                                            border: isActive
                                                ? '2px solid #FBBC04'
                                                : '2px solid transparent',
                                        }}
                                    />
                                ) : (
                                    <InitialsIcon
                                        person={person as Person}
                                        sx={
                                            !isActive
                                                ? {
                                                      ...sx,
                                                      color: 'black',
                                                      backgroundColor:
                                                          'lightgray',
                                                  }
                                                : sx
                                        }
                                    />
                                )}
                                {showIconLabels && (
                                    <Typography sx={{ fontSize: '10px' }}>
                                        {person}
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
