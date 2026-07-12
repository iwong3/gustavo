'use client'

import { colors, hardShadow } from '@/lib/colors'
import { Box, CircularProgress, Typography } from '@mui/material'
import type { ReactNode } from 'react'

import { PullToRefresh } from 'components/pull-to-refresh'

/**
 * Shared outer container for all health pages.
 * Handles max-width, padding, loading spinner, and the sticky header section.
 * If `onRefresh` is provided, the page supports pull-to-refresh.
 */
export function HealthPageLayout({
    loading,
    children,
    onRefresh,
}: {
    loading: boolean
    children: ReactNode
    onRefresh?: () => Promise<unknown> | unknown
}) {
    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress
                    size={24}
                    sx={{ color: colors.primaryYellow }}
                />
            </Box>
        )
    }

    const inner = (
        <Box
            sx={{
                display: 'flex',
                flexDirection: 'column',
                width: '100%',
                maxWidth: 600,
                paddingX: 2,
                paddingTop: 1,
                paddingBottom: 2,
                gap: 2,
            }}>
            {children}
        </Box>
    )

    if (onRefresh) {
        return (
            <PullToRefresh onRefresh={onRefresh} sx={{ minHeight: '100%' }}>
                {inner}
            </PullToRefresh>
        )
    }
    return inner
}

/**
 * Sticky header section for health pages.
 * Renders the colored title chip and optional children (presets, legend, etc.)
 */
export function HealthPageHeader({
    icon,
    title,
    color,
    children,
}: {
    icon: ReactNode
    title: string
    color: string
    children?: ReactNode
}) {
    return (
        <Box
            sx={{
                position: 'sticky',
                top: 0,
                zIndex: 10,
                backgroundColor: colors.secondaryYellow,
                mx: -2,
                px: 2,
                pt: 2,
                pb: 1.5,
                mt: -2,
                display: 'flex',
                flexDirection: 'column',
                gap: 1.25,
            }}>
            <Box
                sx={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 1,
                    px: 1.5,
                    py: 0.75,
                    backgroundColor: color,
                    ...hardShadow,
                    borderRadius: '4px',
                    alignSelf: 'flex-start',
                }}>
                {icon}
                <Typography
                    sx={{
                        fontSize: 15,
                        fontWeight: 700,
                        color: colors.primaryBlack,
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em',
                    }}>
                    {title}
                </Typography>
            </Box>
            {children}
        </Box>
    )
}
