import { Box } from '@mui/material'
import { create } from 'zustand'
import { useShallow } from 'zustand/react/shallow'

import { useEffect } from 'react'
import { getTablerIcon, InitialsIcon } from 'utils/icons'

type FilterPaidByState = {
    filters: Map<string, boolean> // firstName → boolean
}

type FilterPaidByActions = {
    handleFilterClick: (person: string) => void
    isActive: () => boolean
    setFilters: (filters: Map<string, boolean>) => void
    reset: (names: string[]) => void
}

const initialState: FilterPaidByState = {
    filters: new Map<string, boolean>(),
}

const filtersFromNames = (names: string[]) => {
    const filters = new Map<string, boolean>()
    names.forEach((name) => filters.set(name, false))
    return filters
}

export const useFilterPaidByStore = create<
    FilterPaidByState & FilterPaidByActions
>()((set, get) => ({
    ...initialState,

    handleFilterClick: (person: string) => {
        const { filters } = get()
        const newFilters = new Map(filters)
        newFilters.set(person, !newFilters.get(person))
        set(() => ({ filters: newFilters }))
    },

    isActive: () => {
        const { filters } = get()
        return Array.from(filters.values()).includes(true)
    },
    setFilters: (filters: Map<string, boolean>) => set(() => ({ filters })),
    reset: (names: string[]) => {
        set(() => ({ filters: filtersFromNames(names) }))
    },
}))

export const FilterPaidBy = ({
    participantNames,
}: {
    participantNames: string[]
}) => {
    const { filters, handleFilterClick, isActive, setFilters, reset } =
        useFilterPaidByStore(useShallow((state) => state))

    useEffect(() => {
        if (!isActive()) {
            setFilters(filtersFromNames(participantNames))
        }
    }, [])

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
                    'display': 'flex',
                    'justifyContent': 'center',
                    'alignItems': 'center',
                    'marginRight': 2,
                    'borderRadius': '100%',
                    '&:active': {
                        backgroundColor: '#FBBC04',
                    },
                    'transition': 'background-color 0.1s',
                }}
                onClick={() => {
                    reset(participantNames)
                }}>
                {getTablerIcon({ name: 'IconX' })}
            </Box>
            <Box
                sx={{
                    display: 'flex',
                    justifyContent: 'space-evenly',
                    alignItems: 'center',
                    width: '100%',
                }}>
                {Array.from(filters.entries()).map(([person, active]) => {
                    const sx = { fontSize: 10 }

                    return (
                        <Box
                            key={'filter-paid-by-' + person}
                            sx={{
                                display: 'flex',
                                justifyContent: 'center',
                                alignItems: 'center',
                                fontSize: '12px',
                            }}
                            onClick={() => {
                                handleFilterClick(person)
                            }}>
                            <InitialsIcon
                                name={person}
                                sx={
                                    !active
                                        ? {
                                              ...sx,
                                              color: 'black',
                                              backgroundColor: 'lightgray',
                                          }
                                        : sx
                                }
                            />
                        </Box>
                    )
                })}
            </Box>
        </Box>
    )
}
