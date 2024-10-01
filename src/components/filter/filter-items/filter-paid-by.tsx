import Box from '@mui/material/Box'
import { InitialsIcon } from 'components/spend-items/initials-icon'
import { Person, Spend } from 'helpers/spend'
import { useEffect, useState } from 'react'

interface IFilterPaidByProps {
    spendData: Spend[]
    setFilteredSpendData: (filteredSpendData: Spend[]) => void
}

export const FilterPaidBy = ({ spendData, setFilteredSpendData }: IFilterPaidByProps) => {
    const [everyone, setEveryone] = useState<boolean>(true)
    const [filters, setFilters] = useState<Partial<Record<Person, boolean>>>({
        [Person.Aibek]: false,
        [Person.Angela]: false,
        [Person.Ivan]: false,
        [Person.Jenny]: false,
        [Person.Joanna]: false,
        [Person.Lisa]: false,
        [Person.Michelle]: false,
        [Person.MichellesMom]: false,
    })

    useEffect(() => {
        if (Object.values(filters).every((filter) => !filter)) {
            setEveryone(true)
            setFilteredSpendData(spendData)
        } else {
            setEveryone(false)
            const newFilteredSpendData = spendData.filter((spend) => {
                return filters[spend.paidBy]
            })
            setFilteredSpendData(newFilteredSpendData)
        }
    }, [filters])

    const updateFilters = (person: Person) => {
        if (person === Person.Everyone) {
            if (everyone) {
                return
            }

            setEveryone(true)
            setFilters({
                [Person.Aibek]: false,
                [Person.Angela]: false,
                [Person.Ivan]: false,
                [Person.Jenny]: false,
                [Person.Joanna]: false,
                [Person.Lisa]: false,
                [Person.Michelle]: false,
                [Person.MichellesMom]: false,
            })
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
                justifyContent: 'center',
                alignItems: 'center',
                fontSize: '14px',
            }}>
            <Box
                sx={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    width: 24,
                    height: 24,
                    marginLeft: 1,
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
                        sx={{
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                            marginLeft: 1,
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
