'use client'

import { Box, Typography } from '@mui/material'

import { colors, supplementColors } from '@/lib/colors'
import { PageInfo, PageInfoNote, PageInfoSection } from 'components/page-info'

const { fill, fillLight, deep, edge } = supplementColors

/** A calendar-day swatch like the page's. */
const Swatch = ({ bg, border }: { bg: string; border: string }) => (
    <Box component="span" sx={{ width: 16, height: 16, borderRadius: '3px', background: bg, border, flexShrink: 0 }} />
)
const Badge = ({ children, bg }: { children: string; bg: string }) => (
    <Box
        component="span"
        sx={{
            width: 16,
            height: 16,
            flexShrink: 0,
            borderRadius: '50%',
            display: 'grid',
            placeItems: 'center',
            fontSize: 11,
            fontWeight: 800,
            lineHeight: 1,
            backgroundColor: bg,
            border: `1.2px solid ${colors.primaryBlack}`,
        }}>
        {children}
    </Box>
)
const Key = ({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) => (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        {icon}
        <Typography sx={{ fontSize: 13 }}>{children}</Typography>
    </Box>
)

/** The Supplements page's ⓘ: tiles, the calendar key, and the day rules. */
export function SupplementsHelp() {
    return (
        <PageInfo title="How supplements work">
            <PageInfoSection title="Today">
                <Typography sx={{ fontSize: 13 }}>
                    Tap a tile to take a dose; tap a finished one to take it back. <b>Day X</b> is how
                    long you&apos;ve been on it this time around.
                </Typography>
            </PageInfoSection>
            <PageInfoSection title="The calendar">
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                    <Key icon={<Swatch bg={fill} border={`1px solid ${deep}`} />}>Took everything</Key>
                    <Key icon={<Swatch bg={`linear-gradient(to top, ${fill} 55%, ${fillLight} 55%)`} border={`1px solid ${deep}`} />}>
                        Took some
                    </Key>
                    <Key icon={<Swatch bg={colors.primaryWhite} border={`1px dashed ${edge}`} />}>Took nothing</Key>
                    <Key icon={<Badge bg={colors.primaryYellow}>+</Badge>}>Started or restarted something</Key>
                    <Key icon={<Badge bg={colors.primaryWhite}>−</Badge>}>Stopped something</Key>
                    <Key icon={<Badge bg={colors.primaryYellow}>±</Badge>}>Both, or a dose change</Key>
                </Box>
                <Typography sx={{ fontSize: 13, marginTop: 1 }}>
                    Tap a day to see and fix what you took.
                </Typography>
            </PageInfoSection>
            <PageInfoNote>
                <b>After midnight</b>, doses count for the day before until 6 AM.{' '}
                <b>A break</b> of 7+ days without a dose ends a run — the next dose starts again at
                Day 1.
            </PageInfoNote>
        </PageInfo>
    )
}
