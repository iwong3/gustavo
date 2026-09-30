'use client'

import { colors } from '@/lib/colors'
import { Box, CircularProgress } from '@mui/material'
import type { ReactNode } from 'react'

import { HeaderTitle } from 'components/header-title'
import { PullToRefresh } from 'components/pull-to-refresh'

/**
 * Shared outer container for all health pages.
 * Handles max-width, padding, the loading state, and the sticky header section.
 * If `onRefresh` is provided, the page supports pull-to-refresh.
 * Pass `skeleton` (the page-shaped placeholder the route's loading.tsx also
 * shows) so loading never swaps placeholders; without it, a spinner.
 */
export function HealthPageLayout({
    loading,
    skeleton,
    children,
    onRefresh,
}: {
    loading: boolean
    skeleton?: ReactNode
    children: ReactNode
    onRefresh?: () => Promise<unknown> | unknown
}) {
    if (loading && skeleton) return <>{skeleton}</>
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
 * Header for health pages. The colored title chip + `right` render up in the
 * app header beside the back button (HeaderSlot); optional children (presets,
 * legend, etc.) stay in a sticky strip at the top of the page.
 * `right`: controls on the chip's row (action icons, then PageInfo last).
 * `onTitleClick`: makes the chip a button into the section's next level
 * (like tapping a trip's name) — it gets a › and presses in.
 */
export function HealthPageHeader({
    icon,
    title,
    color,
    right,
    onTitleClick,
    children,
}: {
    icon: ReactNode
    title: string
    color: string
    right?: ReactNode
    onTitleClick?: () => void
    children?: ReactNode
}) {
    return (
        <>
            <HeaderTitle icon={icon} title={title} color={color} right={right} onTitleClick={onTitleClick} />
            {children && (
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
                    {children}
                </Box>
            )}
        </>
    )
}
