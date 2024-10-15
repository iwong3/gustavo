import { Box } from '@mui/material'
import { useEffect } from 'react'
import { create } from 'zustand'
import { useShallow } from 'zustand/react/shallow'

import { getTablerIcon, InitialsIcon } from 'helpers/icons'
import { Person } from 'helpers/person'
import { Spend } from 'helpers/spend'

type FilterPaidByState = {
    filters: Partial<Record<Person, boolean>>
}

type FilterPaidByActions = {
    filter: (spendData: Spend[]) => Spend[]
    handleFilterClick: (person: Person) => void

    isActive: () => boolean
    setFilters: (filters: Partial<Record<Person, boolean>>) => void
    reset: () => void
}

const initialState: FilterPaidByState = {
    filters: {
        [Person.Aibek]: false,
        [Person.Angela]: false,
        [Person.Ivan]: false,
        [Person.Jenny]: false,
        [Person.Joanna]: false,
        [Person.Lisa]: false,
        [Person.Michelle]: false,
        [Person.Suming]: false,
    },
}

export const useFilterPaidByStore = create<FilterPaidByState & FilterPaidByActions>()(
    (set, get) => ({
        ...initialState,

        filter: (spendData: Spend[]): Spend[] => {
            const { filters } = get()

            const isAnyFilterActive = Object.values(filters).some((isActive) => isActive)
            if (!isAnyFilterActive) {
                return spendData
            }

            const filteredSpendData = spendData.filter((spend) => {
                return filters[spend.paidBy]
            })
            return filteredSpendData
        },
        handleFilterClick: (person: Person) => {
            const { filters } = get()

            if (person === Person.Everyone) {
                set(() => ({
                    filters: Object.keys(filters).reduce((acc, key) => {
                        acc[key as Person] = false
                        return acc
                    }, {} as Partial<Record<Person, boolean>>),
                }))
            } else {
                set(() => ({
                    filters: {
                        ...filters,
                        [person]: !filters[person],
                    },
                }))
            }
        },

        isActive: () => {
            const { filters } = get()
            const isAnyFilterActive = Object.values(filters).some((isActive) => isActive)
            return isAnyFilterActive
        },
        setFilters: (filters: Partial<Record<Person, boolean>>) => set(() => ({ filters })),
        reset: () => set(initialState),
    })
)

export const FilterPaidBy = () => {
    const { filters, handleFilterClick } = useFilterPaidByStore(useShallow((state) => state))

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
                    'borderRadius': '100%',
                    '&:active': {
                        backgroundColor: '#FBBC04',
                    },
                    'transition': 'background-color 0.1s',
                }}
                onClick={() => {
                    handleFilterClick(Person.Everyone)
                }}>
                {getTablerIcon({ name: 'IconX' })}
            </Box>
            {Object.entries(filters).map(([person, isActive]) => {
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
                            handleFilterClick(person as Person)
                        }}>
                        <InitialsIcon
                            person={person as Person}
                            sx={
                                !isActive
                                    ? { color: 'black', backgroundColor: 'lightgray' }
                                    : undefined
                            }
                        />
                    </Box>
                )
            })}
        </Box>
    )
}
