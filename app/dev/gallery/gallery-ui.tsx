'use client'

/** Shared UI for the dev component gallery — labeled specimens on a phone-width canvas. */
import Link from 'next/link'
import { useState } from 'react'
import { Box, Typography } from '@mui/material'
import { IconArrowLeft } from '@tabler/icons-react'

import NavDrawer from 'components/nav-drawer'
import { colors, cardSx, hardShadow } from '@/lib/colors'

/** Sections shown on the gallery index. Add an entry when adding a section page. */
export const sections = [
    { slug: 'header', title: 'Header', description: 'Trip name fitting, pull-to-refresh' },
    { slug: 'receipts', title: 'Receipts', description: 'Expense rows, date group headers' },
    { slug: 'debt', title: 'Debt', description: 'Balance cards, settlement cards' },
    { slug: 'insights', title: 'Insights', description: 'My Spend chart + share list' },
    { slug: 'forms', title: 'Forms', description: 'Expense/trip forms, delete dialogs — quick-switch to compare' },
    { slug: 'activity', title: 'Activity', description: 'Audit-log rows — diffs, participant lifecycle, restores' },
] as const

const PHONE_WIDTH = 390

/**
 * Gus avatar button — opens the app's nav drawer, the way back into the app
 * from anywhere in the gallery. Raised above the forms page's z-1400 header.
 */
export function GusMenuButton() {
    const [menuOpen, setMenuOpen] = useState(false)
    return (
        <>
            <Box
                onClick={() => setMenuOpen(true)}
                sx={{
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    overflow: 'hidden',
                    cursor: 'pointer',
                    flexShrink: 0,
                    ...hardShadow,
                    '&:active': { boxShadow: 'none', transform: 'translate(1px, 1px)' },
                    transition: 'transform 0.1s, box-shadow 0.1s',
                }}>
                <img
                    src="/gus-fring.png"
                    alt="Open menu"
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                />
            </Box>
            <NavDrawer open={menuOpen} onClose={() => setMenuOpen(false)} zIndex={1450} />
        </>
    )
}

export function GalleryPage({
    title,
    children,
}: {
    title: string
    children: React.ReactNode
}) {
    return (
        <Box sx={{ minHeight: '100vh', backgroundColor: colors.secondaryYellow, pb: 8 }}>
            <Box
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.5,
                    px: 2,
                    py: 1.5,
                    backgroundColor: colors.primaryYellow,
                    borderBottom: `2px solid ${colors.primaryBlack}`,
                }}>
                <GusMenuButton />
                <Link href="/dev/gallery" style={{ display: 'flex', color: colors.primaryBlack }}>
                    <IconArrowLeft size={20} />
                </Link>
                <Typography sx={{ fontSize: 16, fontWeight: 700 }}>
                    Gallery / {title}
                </Typography>
                <Typography sx={{ fontSize: 11, color: 'text.secondary', ml: 'auto' }}>
                    dev only
                </Typography>
            </Box>
            <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 3 }}>
                {children}
            </Box>
        </Box>
    )
}

/**
 * A group of related specimens laid out side by side (wraps on narrow screens),
 * so variants can be compared directly.
 */
export function SpecimenGroup({
    title,
    children,
}: {
    title: string
    children: React.ReactNode
}) {
    return (
        <Box>
            <Typography sx={{ fontSize: 14, fontWeight: 700, mb: 1 }}>{title}</Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'flex-start' }}>
                {children}
            </Box>
        </Box>
    )
}

/** One labeled component state, rendered at phone width by default. */
export function Specimen({
    label,
    width = PHONE_WIDTH,
    children,
}: {
    label: string
    width?: number
    children: React.ReactNode
}) {
    return (
        <Box sx={{ width, maxWidth: '100%' }}>
            <Typography
                sx={{
                    fontSize: 11,
                    fontFamily: 'monospace',
                    color: 'text.secondary',
                    mb: 0.5,
                }}>
                {label}
            </Typography>
            <Box
                sx={{
                    ...cardSx,
                    boxShadow: 'none',
                    borderStyle: 'dashed',
                    p: 1,
                    backgroundColor: colors.primaryWhite,
                }}>
                {children}
            </Box>
        </Box>
    )
}
