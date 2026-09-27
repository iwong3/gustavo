'use client'

import { Box } from '@mui/material'
import { IconChevronRight, IconPointer } from '@tabler/icons-react'

import { colors } from '@/lib/colors'
import { PageInfoNote, PageInfoSection } from 'components/page-info'

const INK = colors.primaryBlack

/** A small avatar like the page's, optionally with the picker's ▸ badge. */
const Face = ({ initials, bg, badge = false, size = 26 }: { initials: string; bg: string; badge?: boolean; size?: number }) => (
    <Box
        component="span"
        sx={{
            position: 'relative',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: size,
            height: size,
            flexShrink: 0,
            borderRadius: '50%',
            border: `1px solid ${INK}`,
            boxShadow: `1.5px 1.5px 0px ${INK}`,
            backgroundColor: bg,
            fontSize: size * 0.36,
            fontWeight: 800,
            color: INK,
        }}>
        {initials}
        {badge && (
            <Box
                component="span"
                sx={{
                    position: 'absolute',
                    right: -4,
                    bottom: -3,
                    width: 14,
                    height: 14,
                    borderRadius: '50%',
                    backgroundColor: colors.primaryWhite,
                    border: `1px solid ${INK}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                }}>
                <IconChevronRight size={10} stroke={2.5} color={INK} />
            </Box>
        )}
    </Box>
)

/**
 * The Insights page's ⓘ body: pictures first, a line of words each —
 * the same approach as the Debts help (components/debt/debts-help.tsx).
 */
export function InsightsHelp() {
    return (
        <>
            <PageInfoSection title="Shares, not payments">
                {/* A $90 dinner split three ways: one third is yours */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, marginTop: 0.75 }}>
                    <Box sx={{ fontSize: 12, fontWeight: 800, color: INK, width: 70, flexShrink: 0 }}>$90 dinner</Box>
                    <Box sx={{ flex: 1, display: 'flex', height: 22, border: `1px solid ${INK}`, backgroundColor: colors.primaryWhite }}>
                        {['You', 'JL', 'MR'].map((who, i) => (
                            <Box
                                key={who}
                                sx={{
                                    flex: 1,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    borderLeft: i > 0 ? `1px solid ${INK}` : 'none',
                                    backgroundColor: i === 0 ? colors.primaryYellow : 'transparent',
                                    fontSize: 11,
                                    fontWeight: 800,
                                    color: i === 0 ? INK : colors.primaryBrown,
                                }}>
                                {who} $30
                            </Box>
                        ))}
                    </Box>
                </Box>
                <Box sx={{ marginTop: 0.75 }}>
                    Amounts are each person&apos;s <b>share</b>, not what they
                    paid: this dinner counts as $30 for you.
                </Box>
            </PageInfoSection>

            <PageInfoSection title="Whose spending">
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, marginTop: 0.75 }}>
                    <Face initials="IW" bg="#a7bed3" badge />
                    <IconPointer size={16} stroke={2} color={INK} />
                    {/* The strip it opens into */}
                    <Box sx={{ display: 'flex', gap: 0.75, alignItems: 'center' }}>
                        <Face initials="IW" bg="#a7bed3" size={22} />
                        <Face initials="JL" bg="#f0e0c0" size={22} />
                        <Face initials="MR" bg="#b8b88a" size={22} />
                        <Face initials="PP" bg="#d9a3a0" size={22} />
                    </Box>
                </Box>
                <Box sx={{ marginTop: 0.75 }}>Tap the avatar to see anyone&apos;s spending.</Box>
            </PageInfoSection>

            <PageInfoSection title="Views and filters">
                {/* The view toggle, then a tapped row becoming a chip */}
                <Box sx={{ display: 'flex', height: 26, marginTop: 0.75, border: `1px solid ${INK}`, borderRadius: '4px', boxShadow: `1.5px 1.5px 0px ${INK}`, overflow: 'hidden', backgroundColor: colors.primaryWhite, fontSize: 11.5, fontWeight: 700, color: INK }}>
                    {['Category', 'Day', 'Place'].map((v, i) => (
                        <Box key={v} sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', borderLeft: i > 0 ? `1px solid ${INK}` : 'none', backgroundColor: i === 0 ? colors.primaryYellow : 'transparent' }}>
                            {v}
                        </Box>
                    ))}
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, marginTop: 1 }}>
                    <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', gap: 0.75, height: 24, paddingX: 0.75, backgroundColor: `${colors.primaryYellow}40`, fontSize: 11.5, fontWeight: 700, color: INK }}>
                        Food
                        <Box sx={{ flex: 1, height: 7, backgroundColor: `${INK}0f` }}>
                            <Box sx={{ width: '60%', height: '100%', backgroundColor: '#e0a44a', borderRight: `1px solid ${INK}` }} />
                        </Box>
                    </Box>
                    <IconChevronRight size={14} stroke={2.2} color={colors.primaryBrown} />
                    <Box
                        component="span"
                        sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, height: 24, paddingX: 1, flexShrink: 0, border: `1px solid ${INK}`, borderRadius: '12px', boxShadow: `1.5px 1.5px 0px ${INK}`, backgroundColor: colors.primaryYellow, fontSize: 11.5, fontWeight: 700, color: INK }}>
                        Food <b>×</b>
                    </Box>
                </Box>
                <Box sx={{ marginTop: 0.75 }}>
                    Tap a category, day or stop to filter the list. Filters
                    stack across views; tap <b>×</b> on a chip to clear it.
                </Box>
            </PageInfoSection>

            <PageInfoNote>Tap an expense to open it.</PageInfoNote>
        </>
    )
}
