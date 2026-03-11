'use client'

import { Box, Collapse, Link, Typography } from '@mui/material'
import { IconChevronDown, IconChevronRight, IconExternalLink } from '@tabler/icons-react'
import { useState } from 'react'

import { colors, hardShadow } from '@/lib/colors'

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

/** Rating → background color (heat gradient: red = bad, yellow/green = good). */
function ratingColor(rating: number): string {
    if (rating >= 4.5) return '#d4edda' // green
    if (rating >= 4.0) return '#e8f5c8' // yellow-green
    if (rating >= 3.5) return '#fff3cd' // yellow
    if (rating >= 3.0) return '#ffe0b2' // orange
    return '#f8d7da' // red
}

interface ChipData {
    label: string
    href?: string
    bg?: string
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

    const hasMetadata = place.priceLevel != null || place.rating != null || place.primaryType || place.website
    const otherExpensesAtPlace = allExpenses.filter(
        (e) => e.googlePlaceId === place.googlePlaceId && e.id !== currentExpenseId
    )

    if (!hasMetadata && otherExpensesAtPlace.length === 0) return null

    // Build chips — order: rating, price, type, website
    const chips: ChipData[] = []
    if (place.rating != null) {
        chips.push({ label: `${place.rating}★`, bg: ratingColor(place.rating) })
    }
    if (place.priceLevel != null && place.priceLevel > 0) {
        chips.push({ label: priceLevelDisplay(place.priceLevel), bg: '#d4edda' }) // green
    }
    if (place.primaryType) {
        chips.push({ label: humanizeType(place.primaryType) })
    }
    if (place.website) {
        chips.push({ label: 'Website', href: place.website, bg: '#d6e4f0' }) // blue tint
    }

    return (
        <Box sx={{ mb: 1 }}>
            {/* Metadata chips */}
            {chips.length > 0 && (
                <Box
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 0.75,
                        flexWrap: 'wrap',
                        mb: otherExpensesAtPlace.length > 0 ? 1.5 : 0,
                    }}>
                    {chips.map((chip) =>
                        chip.href ? (
                            <Link
                                key={chip.label}
                                href={chip.href}
                                target="_blank"
                                rel="noopener noreferrer"
                                sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 0.5,
                                    fontSize: 12,
                                    fontWeight: 600,
                                    color: colors.primaryBlack,
                                    textDecoration: 'none',
                                    px: 1,
                                    py: 0.25,
                                    borderRadius: '4px',
                                    ...hardShadow,
                                    backgroundColor: chip.bg || colors.primaryWhite,
                                    '&:hover': { opacity: 0.85 },
                                    transition: 'opacity 150ms ease',
                                }}>
                                <IconExternalLink size={12} style={{ flexShrink: 0 }} />
                                <Typography
                                    component="span"
                                    sx={{
                                        fontSize: 12,
                                        fontWeight: 600,
                                    }}>
                                    {chip.label}
                                </Typography>
                            </Link>
                        ) : (
                            <Typography
                                key={chip.label}
                                sx={{
                                    fontSize: 12,
                                    fontWeight: 600,
                                    color: colors.primaryBlack,
                                    px: 1,
                                    py: 0.25,
                                    borderRadius: '4px',
                                    ...hardShadow,
                                    backgroundColor: chip.bg || colors.primaryWhite,
                                }}>
                                {chip.label}
                            </Typography>
                        )
                    )}
                </Box>
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
