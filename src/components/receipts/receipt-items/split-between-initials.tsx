import Box from '@mui/material/Box'
import { useEffect, useState } from 'react'

import { InitialsIcon } from 'helpers/icons'
import { Person } from 'helpers/person'
import { Spend } from 'helpers/spend'

interface ISplitBetweenInitialsProps {
    spend: Spend
}

export const SplitBetweenInitials = ({ spend }: ISplitBetweenInitialsProps) => {
    const initialState = {
        [Person.Aibek]: false,
        [Person.Angela]: false,
        [Person.Ivan]: false,
        [Person.Jenny]: false,
        [Person.Joanna]: false,
        [Person.Lisa]: false,
        [Person.Michelle]: false,
        [Person.Suming]: false,
    }

    const [splitters, setSplitters] = useState<Partial<Record<Person, boolean>>>(initialState)

    useEffect(() => {
        const newSplitters: Partial<Record<Person, boolean>> = { ...initialState }
        if (spend.splitBetween[0] === Person.Everyone) {
            Object.keys(newSplitters).forEach((key) => {
                newSplitters[key as Person] = true
            })
        } else {
            spend.splitBetween.forEach((person) => {
                newSplitters[person] = true
            })
        }
        setSplitters(newSplitters)
    }, [spend])

    return (
        <Box
            sx={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                fontSize: 12,
            }}>
            {Object.entries(splitters).map(([person, isSplitter], index) => {
                const size = 24
                const customSx = !isSplitter ? { color: 'black', backgroundColor: 'lightgray' } : {}
                return (
                    <Box
                        key={'split-between-person-' + index}
                        sx={{
                            marginX: 0.75,
                        }}>
                        <InitialsIcon
                            person={person as Person}
                            sx={{ width: size, height: size, ...customSx }}
                        />
                    </Box>
                )
            })}
        </Box>
    )
}
