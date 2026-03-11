'use client'

import { Box, Collapse, Typography } from '@mui/material'
import { IconChevronDown, IconChevronRight } from '@tabler/icons-react'
import { useState } from 'react'

import { colors } from '@/lib/colors'

import type { Expense, PlaceInfo } from '@/lib/types'

/** Map Google place types to human-readable labels. */
function humanizeType(type: string): string {
    return type
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase())
}

/** Render price level as $ signs. */
function priceLevelDisplay(level: number): string {
    return '$'.repeat(Math.max(1, Math.min(4, level)))
}

interface DrawerPlaceMetadataProps {
    place: PlaceInfo
    allExpenses: Expense[] // for "also visited" feature
    currentExpenseId: number
    onJumpToExpense: (expense: Expense) => void
}

export const DrawerPlaceMetadata = ({
    place,
    allExpenses,
    currentExpenseId,
    onJumpToExpense,
}: DrawerPlaceMetadataProps) => {
    const [alsoVisitedOpen, setAlsoVisitedOpen] = useState(false)

    const hasMetadata = place.priceLevel != null || place.rating != null || place.primaryType
    const otherExpensesAtPlace = allExpenses.filter(
        (e) => e.googlePlaceId === place.googlePlaceId && e.id !== currentExpenseId
    )

    if (!hasMetadata && otherExpensesAtPlace.length === 0) return null

    const chips: string[] = []
    if (place.priceLevel != null && place.priceLevel > 0) {
        chips.push(priceLevelDisplay(place.priceLevel))
    }
    if (place.rating != null) {
        chips.push(`${place.rating}★`)
    }
    if (place.primaryType) {
        chips.push(humanizeType(place.primaryType))
    }

    return (
        <Box sx={{ mb: 1 }}>
            {/* Metadata chips */}
            {chips.length > 0 && (
                <Box
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                        flexWrap: 'wrap',
                        mb: otherExpensesAtPlace.length > 0 ? 1.5 : 0,
                    }}>
                    {chips.map((chip) => (
                        <Typography
                            key={chip}
                            sx={{
                                fontSize: 12,
                                fontWeight: 600,
                                color: colors.primaryBlack,
                                px: 1,
                                py: 0.25,
                                borderRadius: '4px',
                                border: `1px solid ${colors.primaryBlack}`,
                                backgroundColor: colors.primaryWhite,
                            }}>
                            {chip}
                        </Typography>
                    ))}
                </Box>
            )}

            {/* Website */}
            {place.website && (
                <Typography
                    component="a"
                    href={place.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    sx={{
                        display: 'block',
                        fontSize: 12,
                        color: colors.primaryBlue,
                        textDecoration: 'underline',
                        mb: 1,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                    }}>
                    {place.website.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')}
                </Typography>
            )}

            {/* Also visited */}
            {otherExpensesAtPlace.length > 0 && (
                <Box>
                    <Box
                        onClick={() => setAlsoVisitedOpen(!alsoVisitedOpen)}
                        sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 0.5,
                            cursor: 'pointer',
                            py: 0.5,
                        }}>
                        {alsoVisitedOpen
                            ? <IconChevronDown size={14} color={colors.primaryBlack} />
                            : <IconChevronRight size={14} color={colors.primaryBlack} />
                        }
                        <Typography sx={{ fontSize: 12, color: 'text.secondary', fontStyle: 'italic' }}>
                            You visited here {otherExpensesAtPlace.length + 1} times
                        </Typography>
                    </Box>
                    <Collapse in={alsoVisitedOpen}>
                        <Box sx={{ pl: 2.5, pt: 0.5 }}>
                            {otherExpensesAtPlace.map((exp) => (
                                <Typography
                                    key={exp.id}
                                    onClick={() => onJumpToExpense(exp)}
                                    sx={{
                                        fontSize: 12,
                                        color: colors.primaryBlue,
                                        cursor: 'pointer',
                                        py: 0.25,
                                        '&:hover': { textDecoration: 'underline' },
                                    }}>
                                    {exp.name} ({exp.date})
                                </Typography>
                            ))}
                        </Box>
                    </Collapse>
                </Box>
            )}
        </Box>
    )
}
