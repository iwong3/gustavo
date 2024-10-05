import Box from '@mui/material/Box'
import { useEffect, useState } from 'react'

import { InitialsIcon } from 'components/spend/spend-items/initials-icon'
import { Person } from 'helpers/person'
import { Spend } from 'helpers/spend'

interface ISplitBetweenInitialsProps {
    spend: Spend
}

export const SplitBetweenInitials = ({ spend }: ISplitBetweenInitialsProps) => {
    const [splitters, setSplitters] = useState<Partial<Record<Person, boolean>>>({
        [Person.Aibek]: false,
        [Person.Angela]: false,
        [Person.Ivan]: false,
        [Person.Jenny]: false,
        [Person.Joanna]: false,
        [Person.Lisa]: false,
        [Person.Michelle]: false,
        [Person.Suming]: false,
    })

    useEffect(() => {
        if (spend.splitBetween[0] === Person.Everyone) {
            setSplitters({
                [Person.Aibek]: true,
                [Person.Angela]: true,
                [Person.Ivan]: true,
                [Person.Jenny]: true,
                [Person.Joanna]: true,
                [Person.Lisa]: true,
                [Person.Michelle]: true,
                [Person.Suming]: true,
            })
        } else {
            const newSplitters = { ...splitters }
            spend.splitBetween.forEach((person) => {
                newSplitters[person] = true
            })
            setSplitters(newSplitters)
        }
    }, [spend])

    return (
        <Box
            sx={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                fontSize: '14px',
            }}>
            {Object.entries(splitters).map(([person, isSplitter], index) => {
                return (
                    <Box
                        key={'split-between-person-' + index}
                        sx={{
                            marginX: 0.5,
                        }}>
                        <InitialsIcon
                            person={person as Person}
                            size={28}
                            colorOverride={!isSplitter ? 'black' : undefined}
                            bgColorOverride={!isSplitter ? 'lightgray' : undefined}
                        />
                    </Box>
                )
            })}
        </Box>
    )
}
