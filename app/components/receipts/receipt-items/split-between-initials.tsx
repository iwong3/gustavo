import Box from '@mui/material/Box'
import { IconGift } from '@tabler/icons-react'
import { useEffect, useMemo, useState } from 'react'

import { colors } from '@/lib/colors'
import { InitialsIcon } from 'utils/icons'
import { useTripData } from 'providers/trip-data-provider'

import type { Expense, UserSummary } from '@/lib/types'

interface ISplitBetweenInitialsProps {
    expense: Expense
}

export const SplitBetweenInitials = ({ expense }: ISplitBetweenInitialsProps) => {
    const { trip } = useTripData()
    const participants = trip.participants

    const coveredIds = useMemo(
        () => new Set(expense.coveredParticipants.map((p) => p.id)),
        [expense.coveredParticipants]
    )

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

    const hasCovered = coveredIds.size > 0

    return (
        <Box
            sx={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                fontSize: 12,
            }}>
            {/* SVG gradient definition for gift icons */}
            {hasCovered && (
                <svg width={0} height={0} style={{ position: 'absolute' }}>
                    <defs>
                        <linearGradient id="giftGradientDisplay" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#e67e22" />
                            <stop offset="100%" stopColor="#c0392b" />
                        </linearGradient>
                    </defs>
                </svg>
            )}
            {Array.from(splitters.entries()).map(
                ([name, { active: isSplitter, user }], index) => {
                    const size = 24
                    const isCovered = isSplitter && coveredIds.has(user.id)
                    const customSx = !isSplitter
                        ? { color: 'black', backgroundColor: 'lightgray' }
                        : {}
                    return (
                        <Box
                            key={'split-between-person-' + index}
                            sx={{
                                marginX: 0.75,
                                position: 'relative',
                            }}>
                            <InitialsIcon
                                name={name}
                                initials={user.initials}
                                iconColor={user.iconColor}
                                sx={{ width: size, height: size, ...customSx }}
                            />
                            {isCovered && (
                                <Box
                                    sx={{
                                        position: 'absolute',
                                        bottom: -4,
                                        right: -6,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                    }}>
                                    <IconGift
                                        size={16}
                                        color={colors.primaryBlack}
                                        fill="url(#giftGradientDisplay)"
                                    />
                                </Box>
                            )}
                        </Box>
                    )
                }
            )}
        </Box>
    )
}
