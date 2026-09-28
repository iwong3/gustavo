'use client'

import { Box, Typography } from '@mui/material'
import { memo } from 'react'

import { colors, supplementColors } from '@/lib/colors'
import { Capsules } from './capsules'

export type SupplementTile = {
    supplementId: number
    name: string
    dosage: string | null
    /** Day X of the current run; null = not running (a break). */
    dayOfRun: number | null
    taken: number
    dosesPerDay: number
}

/**
 * Today's daily stack as 2-column tiles: name, then "5 g · Day 210", with the
 * day's capsules on the right. Tap to take a dose; tap a finished tile to take
 * the last one back (same rules as the Home card). A finished tile sinks into
 * the page — the app's pressed look — and goes lavender. Presentational.
 */
export function SupplementTiles({
    tiles,
    onTap,
}: {
    tiles: SupplementTile[]
    onTap: (tile: SupplementTile) => void
}) {
    return (
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
            {tiles.map((t) => (
                <Tile key={t.supplementId} tile={t} onTap={onTap} />
            ))}
        </Box>
    )
}

const Tile = memo(function Tile({
    tile,
    onTap,
}: {
    tile: SupplementTile
    onTap: (tile: SupplementTile) => void
}) {
    const done = tile.taken >= tile.dosesPerDay
    const sub = [tile.dosage, tile.dayOfRun !== null ? `Day ${tile.dayOfRun}` : null]
    return (
        <Box
            component="button"
            type="button"
            onClick={() => onTap(tile)}
            aria-label={`${tile.name}: ${Math.min(tile.taken, tile.dosesPerDay)} of ${tile.dosesPerDay} taken`}
            sx={{
                'display': 'flex',
                'alignItems': 'center',
                'gap': 0.75,
                'minWidth': 0,
                'minHeight': 52,
                'paddingX': 1.25,
                'paddingY': 1,
                'font': 'inherit',
                'textAlign': 'left',
                'cursor': 'pointer',
                'color': done ? colors.primaryBrown : colors.primaryBlack,
                'backgroundColor': done ? supplementColors.fillLight : colors.primaryWhite,
                'border': `1px solid ${colors.primaryBlack}`,
                'borderRadius': '4px',
                // Done = already pressed in; otherwise it presses in on tap
                'boxShadow': done ? 'none' : `2px 2px 0px ${colors.primaryBlack}`,
                'transform': done ? 'translate(2px, 2px)' : 'none',
                'transition': 'transform 0.1s, box-shadow 0.1s, background-color 0.15s',
                '&:active': { boxShadow: 'none', transform: 'translate(2px, 2px)' },
            }}>
            <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography
                    noWrap
                    sx={{ fontSize: 13.5, fontWeight: 500, lineHeight: 1.25, color: 'inherit' }}>
                    {tile.name}
                </Typography>
                {(tile.dosage || tile.dayOfRun !== null) && (
                    <Typography noWrap sx={{ fontSize: 11.5, lineHeight: 1.3, color: colors.primaryBrown }}>
                        {sub[0]}
                        {sub[0] && sub[1] && ' · '}
                        {sub[1] && (
                            <Box
                                component="span"
                                sx={{ fontWeight: 700, color: done ? 'inherit' : supplementColors.deep }}>
                                {sub[1]}
                            </Box>
                        )}
                    </Typography>
                )}
            </Box>
            <Capsules taken={tile.taken} dosesPerDay={tile.dosesPerDay} />
        </Box>
    )
})
