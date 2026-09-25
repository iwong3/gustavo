'use client'

import { Box, Typography } from '@mui/material'
import type { ReactNode } from 'react'

import { colors } from '@/lib/colors'

/**
 * The title row at the top of a page's content (below the app header): a
 * bold 16px title on the left, controls on the right — page-level toggles,
 * action icons, then the PageInfo ⓘ last. 30px tall so a row with and
 * without controls lines up. Use it on every tool/list page so switching
 * between pages doesn't shift the layout.
 */
export function PageTitleRow({
    title,
    children,
}: {
    title: ReactNode
    /** Right side, in order: toggles / actions, then <PageInfo> last. */
    children?: ReactNode
}) {
    return (
        <Box
            sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 1,
                minHeight: 30,
            }}>
            <Typography
                noWrap
                sx={{
                    fontSize: 16,
                    fontWeight: 800,
                    color: colors.primaryBlack,
                    paddingX: 0.25,
                    minWidth: 0,
                }}>
                {title}
            </Typography>
            {children && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0 }}>
                    {children}
                </Box>
            )}
        </Box>
    )
}
