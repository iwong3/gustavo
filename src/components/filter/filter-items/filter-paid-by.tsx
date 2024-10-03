import Box from '@mui/material/Box'
import { InitialsIcon } from 'components/spend-items/initials-icon'
import { Person, Spend } from 'helpers/spend'
import { useEffect } from 'react'
import { create } from 'zustand'
import { useShallow } from 'zustand/react/shallow'

type FilterPaidByState = {
    everyone: boolean
    filters: Partial<Record<Person, boolean>>

    filterByPaidBy: (spendData: Spend[]) => Spend[]

    setEveryone: (everyone: boolean) => void
    setFilters: (filters: Partial<Record<Person, boolean>>) => void
}

export const useFilterPaidByStore = create<FilterPaidByState>((set, get) => ({
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

    filterByPaidBy: (spendData: Spend[]): Spend[] => {
        const everyone = get().everyone
        const filters = get().filters

        if (everyone) {
            return spendData
        }

        const filteredSpendData = spendData.filter((spend) => {
            return filters[spend.paidBy]
        })
        return filteredSpendData
    },

    setEveryone: (everyone: boolean) => set(() => ({ everyone })),
    setFilters: (filters: Partial<Record<Person, boolean>>) => set(() => ({ filters })),
}))

export const FilterPaidBy = () => {
    const { everyone, filters, setEveryone, setFilters } = useFilterPaidByStore(
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
                justifyContent: 'space-evenly',
                alignItems: 'center',
                marginX: 1,
                width: '100%',
                fontSize: '14px',
            }}>
            <Box
                sx={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    width: 24,
                    height: 24,
                    color: 'black',
                    backgroundColor: everyone ? '#FBBC04' : 'lightgray',
                    borderRadius: '100%',
                }}
                onClick={() => {
                    updateFilters(Person.Everyone)
                }}>
                All
            </Box>
            {Object.entries(filters).map(([person, isActive]) => {
                return (
                    <Box
                        key={'filter-paid-by-' + person}
                        sx={{
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                        }}
                        onClick={() => {
                            updateFilters(person as Person)
                        }}>
                        <InitialsIcon
                            person={person as Person}
                            bgColorOverride={isActive ? '#FBBC04' : 'lightgray'}
                        />
                    </Box>
                )
            })}
        </Box>
    )
}
