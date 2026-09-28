'use client'

import { Box, Typography } from '@mui/material'
import { IconMinus } from '@tabler/icons-react'
import { memo } from 'react'

import { colors, pressShadowSx, supplementColors } from '@/lib/colors'

export type AsNeededTile = {
    supplementId: number
    name: string
    dosage: string | null
    /** Doses logged that day (0 = not taken). */
    taken: number
}

/**
 * As-needed supplements as tiles, beside the daily-stack tiles in the day
 * log form. Tapping a tile logs one more (×1, ×2…); once it has a count, a
 * small − takes one back. Taken ones go lavender and pressed-in, like a
 * finished daily tile. Presentational.
 */
export function AsNeededTiles({
    tiles,
    onAddOne,
    onRemoveOne,
}: {
    tiles: AsNeededTile[]
    onAddOne: (tile: AsNeededTile) => void
    onRemoveOne: (tile: AsNeededTile) => void
}) {
    return (
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
            {tiles.map((t) => (
                <Tile key={t.supplementId} tile={t} onAddOne={onAddOne} onRemoveOne={onRemoveOne} />
            ))}
        </Box>
    )
}

const Tile = memo(function Tile({
    tile,
    onAddOne,
    onRemoveOne,
}: {
    tile: AsNeededTile
    onAddOne: (tile: AsNeededTile) => void
    onRemoveOne: (tile: AsNeededTile) => void
}) {
    const on = tile.taken > 0
    return (
        <Box
            sx={{
                display: 'flex',
                alignItems: 'center',
                minWidth: 0,
                minHeight: 52,
                border: `1px solid ${colors.primaryBlack}`,
                borderRadius: '4px',
                backgroundColor: on ? supplementColors.fillLight : colors.primaryWhite,
                boxShadow: on ? 'none' : `2px 2px 0px ${colors.primaryBlack}`,
                transform: on ? 'translate(2px, 2px)' : 'none',
                transition: 'transform 0.1s, box-shadow 0.1s, background-color 0.15s',
            }}>
            <Box
                component="button"
                type="button"
                onClick={() => onAddOne(tile)}
                aria-label={`Log ${tile.name}${on ? ` (now ${tile.taken})` : ''}`}
                sx={{
                    'flex': 1,
                    'minWidth': 0,
                    'alignSelf': 'stretch',
                    'display': 'flex',
                    'flexDirection': 'column',
                    'justifyContent': 'center',
                    'paddingLeft': 1.25,
                    'paddingRight': on ? 0.5 : 1.25,
                    'paddingY': 1,
                    'font': 'inherit',
                    'textAlign': 'left',
                    'cursor': 'pointer',
                    'border': 'none',
                    'backgroundColor': 'transparent',
                    'color': colors.primaryBlack,
                    'transition': 'opacity 0.1s',
                    '&:active': { opacity: 0.6 },
                }}>
                <Typography noWrap sx={{ fontSize: 13.5, fontWeight: 500, lineHeight: 1.25, color: 'inherit' }}>
                    {tile.name}
                </Typography>
                <Typography noWrap sx={{ fontSize: 11.5, lineHeight: 1.3, color: colors.primaryBrown }}>
                    {on ? (
                        <Box component="span" sx={{ fontWeight: 700, color: supplementColors.deep }}>
                            ×{tile.taken}
                        </Box>
                    ) : (
                        (tile.dosage ?? 'tap to log')
                    )}
                </Typography>
            </Box>
            {on && (
                <Box
                    component="button"
                    type="button"
                    aria-label={`Take one ${tile.name} back`}
                    onClick={() => onRemoveOne(tile)}
                    sx={{
                        width: 30,
                        height: 30,
                        marginRight: 1,
                        flexShrink: 0,
                        display: 'grid',
                        placeItems: 'center',
                        padding: 0,
                        cursor: 'pointer',
                        color: colors.primaryBlack,
                        backgroundColor: colors.primaryWhite,
                        border: `1px solid ${colors.primaryBlack}`,
                        borderRadius: '4px',
                        boxShadow: `1.5px 1.5px 0px ${colors.primaryBlack}`,
                        ...pressShadowSx,
                    }}>
                    <IconMinus size={14} stroke={2.4} />
                </Box>
            )}
        </Box>
    )
})
