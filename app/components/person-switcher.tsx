'use client'

import { Box } from '@mui/material'

import { colors } from '@/lib/colors'
import type { UserSummary } from '@/lib/types'
import { InitialsIcon } from 'utils/icons'

/**
 * Row of participant avatars for anchoring a page to one person (insights,
 * debts). Only the selected person keeps their color — the rest go white so
 * it's obvious whose page it is.
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
    return (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {label && (
                <Box
                    sx={{
                        fontSize: 10.5,
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                        color: colors.primaryBrown,
                        marginRight: 0.25,
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
                            'borderRadius': '50%',
                            'outline': selected
                                ? `3px solid ${colors.primaryYellow}`
                                : '3px solid transparent',
                            'outlineOffset': '1px',
                            'transition': 'outline-color 0.15s',
                            '&:active': {
                                transform: 'translate(1px, 1px)',
                            },
                        }}>
                        <InitialsIcon
                            name={p.firstName}
                            initials={p.initials}
                            iconColor={
                                selected ? p.iconColor : colors.primaryWhite
                            }
                            sx={{
                                width: 40,
                                height: 40,
                                fontSize: 13,
                                boxShadow: `2px 2px 0px ${colors.primaryBlack}`,
                                transition: 'background-color 0.15s',
                            }}
                        />
                    </Box>
                )
            })}
        </Box>
    )
}
