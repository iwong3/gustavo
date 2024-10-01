import { useEffect, useState } from 'react'

import { Person, Spend, SpendType } from 'helpers/spend'
import Box from '@mui/material/Box'
import { InitialsIcon } from 'components/spend-items/initials-icon'

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
        [Person.MichellesMom]: false,
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
                [Person.MichellesMom]: true,
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
            {Object.entries(splitters).map(([person, isSplitter]) => {
                return (
                    <InitialsIcon
                        person={person as Person}
                        size={28}
                        bgColorOverride={!isSplitter ? 'lightgray' : undefined}
                    />
                )
            })}
        </Box>
    )
}
