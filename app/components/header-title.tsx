'use client'

import { Box, Typography } from '@mui/material'
import { IconChevronRight } from '@tabler/icons-react'
import type { ReactNode } from 'react'

import { colors, hardShadow, pressShadowSx } from '@/lib/colors'
import { HeaderSlot } from 'components/header-slot'

/**
 * A page's title as a coloured chip up in the app header, beside Gus / the
 * back button (HeaderSlot), with `right` controls at the far end (action
 * icons, then PageInfo last). `onTitleClick` makes the chip a button into
 * the section's next level — it gets a › and presses in.
 * Health pages use it through HealthPageHeader; Settings pages directly.
 */
export function HeaderTitle({
    icon,
    title,
    color = colors.primaryYellow,
    right,
    onTitleClick,
}: {
    icon: ReactNode
    title: string
    color?: string
    right?: ReactNode
    onTitleClick?: () => void
}) {
    return (
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
    )
}
