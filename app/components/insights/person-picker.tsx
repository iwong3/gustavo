'use client'

import { Box, ClickAwayListener } from '@mui/material'
import { IconChevronRight } from '@tabler/icons-react'
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'

import { colors, pressIconSx } from '@/lib/colors'
import type { UserSummary } from '@/lib/types'
import { InitialsIcon } from 'utils/icons'

const SIZE = 36
const GAP = 8
// Room around each avatar for its selection ring inside the strip's clip
const RING = 5
// One avatar's worth of strip: the collapsed width
const SLOT = SIZE + RING * 2
const EASE = 'cubic-bezier(0.2, 0.9, 0.3, 1)'
const DURATION = 220

function Avatar({
    person,
    selected,
    onClick,
    label,
    pressed,
    badge,
    appear,
}: {
    person: UserSummary
    selected: boolean
    onClick: () => void
    label: string
    pressed?: boolean
    /** Collapsed: a small ▸ hints that it opens. */
    badge?: boolean
    /** Cross-fade in when this slot's person changes. */
    appear?: boolean
}) {
    return (
        <Box
            component="button"
            type="button"
            aria-label={label}
            aria-pressed={pressed}
            onClick={onClick}
            sx={{
                'position': 'relative',
                'flexShrink': 0,
                'padding': 0,
                'border': 'none',
                'background': 'none',
                'cursor': 'pointer',
                'borderRadius': '50%',
                'outline': selected ? `3px solid ${colors.primaryYellow}` : '3px solid transparent',
                'outlineOffset': '1px',
                'opacity': selected ? 1 : 0.4,
                'transition': 'outline-color 0.15s, opacity 0.15s, transform 0.1s ease-out',
                '&:active': pressIconSx['&:active'],
                ...(appear && {
                    'animation': 'slotIn 160ms ease-out',
                    '@keyframes slotIn': { from: { opacity: 0 }, to: { opacity: 1 } },
                }),
            }}>
            <InitialsIcon
                name={person.firstName}
                initials={person.initials}
                iconColor={person.iconColor}
                sx={{
                    width: SIZE,
                    height: SIZE,
                    fontSize: 12,
                    boxShadow: `2px 2px 0px ${colors.primaryBlack}`,
                }}
            />
            {badge && (
                <Box
                    sx={{
                        position: 'absolute',
                        right: -4,
                        bottom: -3,
                        width: 16,
                        height: 16,
                        borderRadius: '50%',
                        backgroundColor: colors.primaryWhite,
                        border: `1px solid ${colors.primaryBlack}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'opacity 0.12s',
                    }}>
                    <IconChevronRight size={11} stroke={2.5} color={colors.primaryBlack} />
                </Box>
            )}
        </Box>
    )
}

/**
 * Whose data a page shows, as one avatar that opens into the full list.
 *
 * One strip, always rendered: the first slot, a divider, then everyone else
 * A–Z. Closed, it's clipped to the first slot (the selected person, with a
 * ▸) and `children` sit beside it — the page's description of the current
 * view (name, filter chips). Opening widens the strip to the right: the
 * first slot becomes the viewer, the rest fade in, and the side content
 * fades as the strip takes its room. Closing runs the same in reverse.
 */
export function PersonPicker({
    participants,
    selectedId,
    currentUserId,
    onSelect,
    children,
}: {
    participants: UserSummary[]
    selectedId: number
    currentUserId: number
    onSelect: (id: number) => void
    children?: React.ReactNode
}) {
    const [open, setOpen] = useState(false)
    const clipRef = useRef<HTMLDivElement | null>(null)
    const innerRef = useRef<HTMLDivElement | null>(null)
    const [fullWidth, setFullWidth] = useState(SLOT)

    const same = (a: number, b: number) => String(a) === String(b)

    // Viewer first, then everyone else alphabetically (ids can be strings
    // at runtime — compare as strings)
    const [me, others] = useMemo(() => {
        const self = participants.find((p) => same(p.id, currentUserId))
        const rest = participants
            .filter((p) => !same(p.id, currentUserId))
            .sort((a, b) => a.firstName.localeCompare(b.firstName))
        return [self, rest] as const
    }, [participants, currentUserId])

    const selected = participants.find((p) => same(p.id, selectedId))
    // Open: the list's own first entry (the viewer); closed: whoever's shown
    const listHead = me ?? others[0]
    const slotPerson = open ? listHead : selected
    const rest = me ? others : others.slice(1)

    // The strip's natural width, to animate to (content never changes size
    // with open/closed, so measure once per participant list)
    useLayoutEffect(() => {
        if (innerRef.current) setFullWidth(innerRef.current.scrollWidth)
    }, [participants, currentUserId])

    // Back at the start when it closes, so the first slot is what shows
    useEffect(() => {
        if (!open && clipRef.current) clipRef.current.scrollLeft = 0
    }, [open])

    const pick = (id: number) => {
        onSelect(id)
        setOpen(false)
    }

    if (!selected || !slotPerson) return null

    return (
        <ClickAwayListener onClickAway={() => open && setOpen(false)}>
            <Box sx={{ display: 'flex', alignItems: 'center', minHeight: SIZE }}>
                {/* The strip: clipped to one slot closed, full width open */}
                <Box
                    ref={clipRef}
                    sx={{
                        'flexShrink': 0,
                        'width': open ? fullWidth : SLOT,
                        'maxWidth': `calc(100% + ${RING * 2}px)`,
                        'margin': `-${RING}px`,
                        'overflowX': open ? 'auto' : 'hidden',
                        'overflowY': 'hidden',
                        'transition': `width ${DURATION}ms ${EASE}`,
                        'scrollbarWidth': 'none',
                        '&::-webkit-scrollbar': { display: 'none' },
                    }}>
                    <Box
                        ref={innerRef}
                        sx={{ display: 'flex', alignItems: 'center', gap: `${GAP}px`, padding: `${RING}px`, width: 'max-content' }}>
                        <Avatar
                            key={slotPerson.id}
                            person={slotPerson}
                            selected={open ? same(slotPerson.id, selectedId) : true}
                            badge={!open}
                            appear
                            pressed={open ? same(slotPerson.id, selectedId) : undefined}
                            label={open ? slotPerson.firstName : `Showing ${selected.firstName} — change person`}
                            onClick={() => (open ? pick(slotPerson.id) : setOpen(true))}
                        />
                        {me && others.length > 0 && (
                            <Box
                                sx={{
                                    width: '1.5px',
                                    height: 26,
                                    flexShrink: 0,
                                    backgroundColor: `${colors.primaryBlack}40`,
                                    opacity: open ? 1 : 0,
                                    transition: `opacity ${DURATION}ms`,
                                }}
                            />
                        )}
                        {rest.map((p, i) => (
                            <Box
                                key={p.id}
                                sx={{
                                    // Fade in left→right as the strip widens
                                    opacity: open ? 1 : 0,
                                    transform: open ? 'none' : 'translateX(-8px)',
                                    transition: `opacity 160ms ease-out ${open ? 40 + i * 25 : 0}ms, transform ${DURATION}ms ${EASE}`,
                                    pointerEvents: open ? 'auto' : 'none',
                                }}>
                                <Avatar
                                    person={p}
                                    selected={same(p.id, selectedId)}
                                    pressed={same(p.id, selectedId)}
                                    label={p.firstName}
                                    onClick={() => pick(p.id)}
                                />
                            </Box>
                        ))}
                    </Box>
                </Box>

                {/* Beside the avatar: fades out while the strip is open */}
                <Box
                    aria-hidden={open}
                    sx={{
                        flex: 1,
                        minWidth: 0,
                        marginLeft: `${GAP + RING}px`,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 0.75,
                        overflow: 'hidden',
                        opacity: open ? 0 : 1,
                        transition: `opacity ${open ? 100 : 180}ms ease-out ${open ? 0 : 60}ms`,
                        pointerEvents: open ? 'none' : 'auto',
                    }}>
                    {children}
                </Box>
            </Box>
        </ClickAwayListener>
    )
}
