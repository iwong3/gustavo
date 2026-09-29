'use client'

import { colors, hardShadow, pressShadowSx } from '@/lib/colors'
import { Box, CircularProgress, Typography } from '@mui/material'
import { IconChevronRight } from '@tabler/icons-react'
import type { ReactNode } from 'react'

import { HeaderSlot } from 'components/header-slot'
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
            <HeaderSlot>
            <Box sx={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
                <Box
                    {...(onTitleClick
                        ? { component: 'button' as const, type: 'button' as const, onClick: onTitleClick }
                        : {})}
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
                        font: 'inherit',
                        ...(onTitleClick && { cursor: 'pointer', ...pressShadowSx }),
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
                    {onTitleClick && (
                        <IconChevronRight size={16} stroke={2.4} color={colors.primaryBlack} style={{ marginLeft: -4 }} />
                    )}
                </Box>
                {right && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0 }}>{right}</Box>
                )}
            </Box>
            </HeaderSlot>
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
