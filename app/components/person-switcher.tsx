'use client'

import { Box } from '@mui/material'

import { colors } from '@/lib/colors'
import type { UserSummary } from '@/lib/types'
import { InitialsIcon } from 'utils/icons'

/**
 * Row of participant avatars for anchoring a page to one person (insights,
 * debts). Everyone keeps their icon color for quick recognition; unselected
 * avatars just fade back while the selected one sits at full strength with a
 * yellow ring. Big groups (7+) get smaller avatars and the row swipes
 * sideways, bleeding to the screen edge while the content keeps the page's
 * 16px inset (both consumer pages use paddingX: 2).
 */
export function PersonSwitcher({
    participants,
    selectedId,
    onSelect,
    label,
}: {
    participants: UserSummary[]
    selectedId: number
    onSelect: (id: number) => void
    /** Optional small uppercase label before the avatars, e.g. "View as". */
    label?: string
}) {
    const compact = participants.length > 5
    const size = compact ? 32 : 40
    return (
        <Box
            sx={{
                'display': 'flex',
                'alignItems': 'center',
                'gap': 1,
                'overflowX': 'auto',
                // Bleed the scroll area to the screen edges; keep the inset
                'marginX': -2,
                'paddingX': 2,
                // Room for the selection outline inside the scroll clip
                'paddingY': '5px',
                'marginY': '-5px',
                'scrollbarWidth': 'none',
                '&::-webkit-scrollbar': { display: 'none' },
            }}>
            {label && (
                <Box
                    sx={{
                        fontSize: 10.5,
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                        color: colors.primaryBrown,
                        marginRight: 0.25,
                        flexShrink: 0,
                    }}>
                    {label}
                </Box>
            )}
            {participants.map((p) => {
                const selected = p.id === selectedId
                return (
                    <Box
                        key={p.id}
                        onClick={() => onSelect(p.id)}
                        sx={{
                            'cursor': 'pointer',
                            'flexShrink': 0,
                            'borderRadius': '50%',
                            'outline': selected
                                ? `3px solid ${colors.primaryYellow}`
                                : '3px solid transparent',
                            'outlineOffset': '1px',
                            'opacity': selected ? 1 : 0.4,
                            'transition': 'outline-color 0.15s, opacity 0.15s',
                            '&:active': {
                                transform: 'translate(1px, 1px)',
                            },
                        }}>
                        <InitialsIcon
                            name={p.firstName}
                            initials={p.initials}
                            iconColor={p.iconColor}
                            sx={{
                                width: size,
                                height: size,
                                fontSize: compact ? 11 : 13,
                                boxShadow: `2px 2px 0px ${colors.primaryBlack}`,
                            }}
                        />
                    </Box>
                )
            })}
        </Box>
    )
}
