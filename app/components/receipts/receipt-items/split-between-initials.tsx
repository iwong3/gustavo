import Box from '@mui/material/Box'
import { useEffect, useState } from 'react'

import { InitialsIcon } from 'utils/icons'
import { useSpendData } from 'providers/spend-data-provider'

import type { Expense, UserSummary } from '@/lib/types'

interface ISplitBetweenInitialsProps {
    expense: Expense
}

export const SplitBetweenInitials = ({ expense }: ISplitBetweenInitialsProps) => {
    const { participants } = useSpendData()

    const getInitialState = () => {
        const filters = new Map<string, { active: boolean; user: UserSummary }>()
        participants.forEach((p) => {
            filters.set(p.firstName, { active: false, user: p })
        })
        return filters
    }

    const [splitters, setSplitters] =
        useState(getInitialState)

    useEffect(() => {
        const newSplitters = getInitialState()

        if (expense.isEveryone) {
            newSplitters.forEach((val, key) => {
                newSplitters.set(key, { ...val, active: true })
            })
        } else {
            expense.splitBetween.forEach((person) => {
                const existing = newSplitters.get(person.firstName)
                if (existing) {
                    newSplitters.set(person.firstName, { ...existing, active: true })
                }
            })
        }

        setSplitters(newSplitters)
    }, [expense, participants])

    return (
        <Box
            sx={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                fontSize: 12,
            }}>
            {Array.from(splitters.entries()).map(
                ([name, { active: isSplitter, user }], index) => {
                    const size = 24
                    const customSx = !isSplitter
                        ? { color: 'black', backgroundColor: 'lightgray' }
                        : {}
                    return (
                        <Box
                            key={'split-between-person-' + index}
                            sx={{
                                marginX: 0.75,
                            }}>
                            <InitialsIcon
                                name={name}
                                initials={user.initials}
                                sx={{ width: size, height: size, ...customSx }}
                            />
                        </Box>
                    )
                }
            )}
        </Box>
    )
}
