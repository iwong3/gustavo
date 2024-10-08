import { Box } from '@mui/material'
import { useEffect } from 'react'
import { create } from 'zustand'
import { useShallow } from 'zustand/react/shallow'

import { getTablerIcon, InitialsIcon } from 'helpers/icons'
import { Person } from 'helpers/person'
import { Spend } from 'helpers/spend'

type FilterSplitBetweenState = {
    everyone: boolean
    filters: Partial<Record<Person, boolean>>
}

type FilterSplitBetweenActions = {
    filter: (spendData: Spend[]) => Spend[]
    isActive: () => boolean

    setEveryone: (everyone: boolean) => void
    setFilters: (filters: Partial<Record<Person, boolean>>) => void
    reset: () => void
}

const initialState: FilterSplitBetweenState = {
    everyone: true,
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

export const useFilterSplitBetweenStore = create<
    FilterSplitBetweenState & FilterSplitBetweenActions
>()((set, get) => ({
    ...initialState,

    filter: (spendData: Spend[]): Spend[] => {
        const { everyone, filters } = get()

        if (everyone) {
            return spendData
        }

        const filteredSpendData = spendData.filter((spend) => {
            return spend.splitBetween.some((person) => {
                return person === Person.Everyone || filters[person]
            })
        })
        return filteredSpendData
    },
    isActive: () => {
        const { everyone } = get()
        return !everyone
    },

    setEveryone: (everyone: boolean) => set(() => ({ everyone })),
    setFilters: (filters: Partial<Record<Person, boolean>>) => set(() => ({ filters })),
    reset: () => set(initialState),
}))

export const FilterSplitBetween = () => {
    const { everyone, filters, setEveryone, setFilters } = useFilterSplitBetweenStore(
        useShallow((state) => state)
    )

    useEffect(() => {
        if (Object.values(filters).every((filter) => !filter)) {
            setEveryone(true)
        } else {
            setEveryone(false)
        }
    }, [filters])

    const updateFilters = (person: Person) => {
        if (person === Person.Everyone) {
            if (everyone) {
                return
            }

            setEveryone(true)
            setFilters(
                Object.keys(filters).reduce((acc, key) => {
                    acc[key as Person] = false
                    return acc
                }, {} as Partial<Record<Person, boolean>>)
            )
        } else {
            setFilters({
                ...filters,
                [person]: !filters[person],
            })
        }
    }

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
                    updateFilters(Person.Everyone)
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
                            updateFilters(person as Person)
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
