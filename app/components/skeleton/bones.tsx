'use client'

import { Box, Skeleton } from '@mui/material'
import type { SxProps, Theme } from '@mui/material'

import { colors } from '@/lib/colors'

// Building blocks for loading placeholders that match the loaded layout
// exactly. The rule: a skeleton reserves the same box the real element
// occupies — text by its line box (fontSize × lineHeight), controls by their
// explicit height — so nothing shifts when content arrives. Build page
// skeletons from these, copying padding/gaps from the real components.

const BONE_RADIUS = '3px'

/** A solid block — controls, chips, images. */
export function Bone({
    width = '100%',
    height,
    radius = BONE_RADIUS,
    sx,
}: {
    width?: number | string
    height: number | string
    radius?: number | string
    sx?: SxProps<Theme>
}) {
    return (
        <Skeleton
            variant="rectangular"
            width={width}
            height={height}
            sx={{ borderRadius: radius, flexShrink: 0, ...sx }}
        />
    )
}

/**
 * An empty neo-brutalist control outline (search field, toolbar button,
 * card shell) — chrome that's always there, drawn as itself rather than as a
 * grey bar, so the frame of the page is already right while data loads.
 */
export function ChromeBox({
    width = '100%',
    height,
    radius = '4px',
    children,
    sx,
}: {
    width?: number | string
    height?: number | string
    radius?: number | string
    children?: React.ReactNode
    sx?: SxProps<Theme>
}) {
    return (
        <Box
            sx={{
                width,
                height,
                flexShrink: 0,
                border: `1px solid ${colors.primaryBlack}`,
                boxShadow: `2px 2px 0px ${colors.primaryBlack}`,
                borderRadius: radius,
                backgroundColor: colors.primaryWhite,
                ...sx,
            }}>
            {children}
        </Box>
    )
}

/** A circle — avatars, category icons. */
export function Circle({ size }: { size: number }) {
    return (
        <Skeleton
            variant="circular"
            width={size}
            height={size}
            sx={{ flexShrink: 0 }}
        />
    )
}

/**
 * One line of text: reserves the full line box (fontSize × lineHeight) and
 * draws a bar about cap-height tall inside it, like the glyphs would.
 */
export function TextBone({
    fontSize,
    lineHeight = 1.5,
    width = '60%',
    sx,
}: {
    fontSize: number
    lineHeight?: number
    width?: number | string
    sx?: SxProps<Theme>
}) {
    return (
        <Box
            sx={{
                height: fontSize * lineHeight,
                display: 'flex',
                alignItems: 'center',
                width,
                flexShrink: 0,
                ...sx,
            }}>
            <Skeleton
                variant="rectangular"
                width="100%"
                height={Math.round(fontSize * 0.75)}
                sx={{ borderRadius: BONE_RADIUS }}
            />
        </Box>
    )
}
