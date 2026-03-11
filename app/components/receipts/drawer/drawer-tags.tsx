'use client'

import { Box, Typography } from '@mui/material'

import { colors } from '@/lib/colors'

import type { Expense } from '@/lib/types'

interface DrawerTagsProps {
    expense: Expense
}

export const DrawerTags = ({ expense }: DrawerTagsProps) => {
    const tags: string[] = []
    if (expense.categoryName) tags.push(expense.categoryName)
    if (expense.locationName) tags.push(expense.locationName)

    if (tags.length === 0) return null

    return (
        <Box
            sx={{
                mx: 2.5,
                mb: 1.5,
                display: 'flex',
                gap: 0.75,
                flexWrap: 'wrap',
            }}>
            {tags.map((tag) => (
                <Typography
                    key={tag}
                    sx={{
                        fontSize: 11,
                        fontWeight: 600,
                        color: colors.primaryBlack,
                        px: 1,
                        py: 0.25,
                        borderRadius: '4px',
                        border: `1px solid ${colors.primaryBlack}`,
                        backgroundColor: colors.secondaryYellow,
                    }}>
                    {tag}
                </Typography>
            ))}
        </Box>
    )
}
