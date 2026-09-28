'use client'

import { Box, Typography } from '@mui/material'
import { IconPlus } from '@tabler/icons-react'
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
 * log form: dashed until taken. Tap to toggle (took it / didn't); once on, a
 * small + logs another (×2, ×3) and tapping the tile clears it back to 0.
 * Presentational.
 */
export function AsNeededTiles({
    tiles,
    onToggle,
    onAddOne,
}: {
    tiles: AsNeededTile[]
    onToggle: (tile: AsNeededTile) => void
    onAddOne: (tile: AsNeededTile) => void
}) {
    return (
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
            {tiles.map((t) => (
                <Tile key={t.supplementId} tile={t} onToggle={onToggle} onAddOne={onAddOne} />
            ))}
        </Box>
    )
}

const Tile = memo(function Tile({
    tile,
    onToggle,
    onAddOne,
}: {
    tile: AsNeededTile
    onToggle: (tile: AsNeededTile) => void
    onAddOne: (tile: AsNeededTile) => void
}) {
    const on = tile.taken > 0
    return (
        <Box
            sx={{
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                minWidth: 0,
                minHeight: 52,
                border: on ? `1px solid ${colors.primaryBlack}` : `1px dashed ${supplementColors.edge}`,
                borderRadius: '4px',
                backgroundColor: on ? colors.primaryWhite : 'transparent',
                boxShadow: on ? `2px 2px 0px ${colors.primaryBlack}` : 'none',
            }}>
            <Box
                component="button"
                type="button"
                onClick={() => onToggle(tile)}
                aria-pressed={on}
                aria-label={on ? `${tile.name}: taken ${tile.taken}, tap to clear` : `Log ${tile.name}`}
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
                    'color': on ? colors.primaryBlack : colors.primaryBrown,
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
                    aria-label={`Log another ${tile.name}`}
                    onClick={() => onAddOne(tile)}
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
                        backgroundColor: supplementColors.fillLight,
                        border: `1px solid ${colors.primaryBlack}`,
                        borderRadius: '4px',
                        boxShadow: `1.5px 1.5px 0px ${colors.primaryBlack}`,
                        ...pressShadowSx,
                    }}>
                    <IconPlus size={14} stroke={2.4} />
                </Box>
            )}
        </Box>
    )
})
