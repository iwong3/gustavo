'use client'

import { Box, Typography } from '@mui/material'
import { IconLock } from '@tabler/icons-react'

import { getCategoryLook } from '@/lib/category-icons'
import { colors, hardShadow } from '@/lib/colors'
import { CategoryGlyph } from 'utils/category-icons'

export const TILE_MIN_HEIGHT = 104

/** "37% of expenses" / "<1% of expenses" / "Not used yet". */
export function shareLabel(count: number, total: number) {
    if (count === 0 || total === 0) return 'Not used yet'
    const pct = (count / total) * 100
    return `${pct < 1 ? '<1' : Math.round(pct)}% of expenses`
}

/**
 * A category as a tinted tile: its colour is the tile, its icon sits on a
 * white circle (no border — a box in a box otherwise), count top-right,
 * name + share at the bottom. Built-in categories get a lock and no shadow.
 * Presentational — the Categories page wraps it in a link, the form uses it
 * as the live preview.
 */
export function CategoryTile({
    name,
    icon,
    color,
    count,
    caption,
    builtIn = false,
}: {
    name: string
    icon: string | null | undefined
    color: string | null | undefined
    count: number
    caption: string
    builtIn?: boolean
}) {
    const look = getCategoryLook(name, icon, color)
    return (
        <Box
            sx={{
                ...hardShadow,
                ...(builtIn && { boxShadow: 'none' }),
                backgroundColor: look.color,
                borderRadius: '6px',
                padding: 1.375,
                minHeight: TILE_MIN_HEIGHT,
                display: 'flex',
                flexDirection: 'column',
                gap: 1.25,
                color: colors.primaryBlack,
                transition: 'background-color 0.15s',
            }}>
            <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <Box
                    sx={{
                        width: 38,
                        height: 38,
                        borderRadius: '50%',
                        backgroundColor: '#fff',
                        display: 'grid',
                        placeItems: 'center',
                    }}>
                    <CategoryGlyph icon={look.icon} size={21} />
                </Box>
                {builtIn ? (
                    <IconLock size={14} color={colors.primaryBrown} aria-label="Built in" />
                ) : (
                    <Typography sx={{ fontSize: 13, fontWeight: 700, fontFamily: 'monospace' }}>{count}</Typography>
                )}
            </Box>
            <Box sx={{ marginTop: 'auto', minWidth: 0 }}>
                <Typography sx={{ fontSize: 15, fontWeight: 700, lineHeight: 1.25, overflowWrap: 'anywhere' }}>
                    {name || 'New category'}
                </Typography>
                <Typography sx={{ fontSize: 11.5, color: colors.primaryBrown }}>{caption}</Typography>
            </Box>
        </Box>
    )
}
