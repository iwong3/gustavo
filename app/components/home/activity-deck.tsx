'use client'

/**
 * ActivityDeck — the home page's "Latest": a small stack of cards, one per
 * expense someone else added/edited/deleted on your trips this week
 * (`GET /api/home/activity`).
 *
 * The top card auto-advances every CYCLE_MS: it flies off to the left and
 * tucks in at the back. Swipe left for the next card, right for the previous
 * one; touching the deck pauses the timer until RESUME_MS after you let go.
 * Tapping a card opens that trip's Activity page. Gesture follows code-guide
 * § Touch Gesture Conventions (axis-lock, `touch-action: pan-y`,
 * preventDefault once horizontal, yield to descendants). Reduced motion: no
 * auto-advance, swipes still work.
 *
 * Presentational + gallery-importable: `now` pins relative times,
 * `autoAdvance={false}` freezes a specimen.
 */
import { Box, Typography } from '@mui/material'
import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'

import { colors } from '@/lib/colors'
import type { HomeActivityEntry } from '@/lib/types'
import { FormattedMoney } from 'utils/currency'
import { InitialsIcon } from 'utils/icons'
import { formatRelativeTime } from 'utils/time'

const CYCLE_MS = 4000
const RESUME_MS = 4000
const EXIT_MS = 280
const SWIPE_THRESHOLD = 56
const CARD_H = 62
/** Offset of each card behind the top one. */
const STACK_STEP = 7

const VERB: Record<HomeActivityEntry['intent'], string> = {
    create: 'added',
    update: 'edited',
    delete: 'deleted',
    restore: 'restored',
}

const prefersReducedMotion = () =>
    typeof window !== 'undefined' &&
    !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

function formatAmount(entry: HomeActivityEntry): string | null {
    if (entry.costOriginal === null || !Number.isFinite(entry.costOriginal)) return null
    try {
        return FormattedMoney(entry.currency).format(entry.costOriginal)
    } catch {
        return `${entry.costOriginal} ${entry.currency}`
    }
}

function DeckCard({ entry, now, interactive }: { entry: HomeActivityEntry; now?: Date; interactive: boolean }) {
    const amount = formatAmount(entry)
    const deleted = entry.intent === 'delete'
    return (
        <Box
            component={Link}
            href={`/gustavo/trips/${entry.tripSlug}/activity`}
            tabIndex={interactive ? 0 : -1}
            aria-hidden={!interactive}
            draggable={false}
            sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1.25,
                height: CARD_H,
                paddingX: 1.5,
                backgroundColor: colors.primaryWhite,
                border: `1px solid ${colors.primaryBlack}`,
                borderRadius: '6px',
                boxShadow: `2px 2px 0px ${colors.primaryBlack}`,
                color: colors.primaryBlack,
                textDecoration: 'none',
                userSelect: 'none',
                WebkitTouchCallout: 'none',
            }}>
            <InitialsIcon
                name={entry.actor.name}
                initials={entry.actor.initials}
                iconColor={entry.actor.iconColor}
                sx={{ width: 26, height: 26, fontSize: 10, flexShrink: 0, boxShadow: 'none' }}
            />
            <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography
                    sx={{
                        fontSize: 13,
                        lineHeight: 1.3,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                    }}>
                    <b>{entry.actor.name}</b> {VERB[entry.intent]}{' '}
                    <Box component="span" sx={{ fontWeight: 600 }}>
                        {entry.expenseName}
                    </Box>
                </Typography>
                <Typography
                    sx={{
                        fontSize: 11.5,
                        lineHeight: 1.3,
                        color: colors.primaryBrown,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                    }}>
                    {entry.tripName} · {formatRelativeTime(entry.changedAt, now)}
                </Typography>
            </Box>
            {amount && (
                <Typography
                    sx={{
                        fontFamily: 'var(--font-mono, monospace)',
                        fontSize: 13,
                        fontWeight: 600,
                        fontVariantNumeric: 'tabular-nums',
                        whiteSpace: 'nowrap',
                        flexShrink: 0,
                        ...(deleted && { textDecoration: 'line-through', color: colors.primaryBrown }),
                    }}>
                    {amount}
                </Typography>
            )}
        </Box>
    )
}

export default function ActivityDeck({
    entries,
    now,
    autoAdvance = true,
}: {
    entries: HomeActivityEntry[]
    now?: Date
    autoAdvance?: boolean
}) {
    const count = entries.length
    const [index, setIndex] = useState(0)
    const indexRef = useRef(index)
    useEffect(() => {
        indexRef.current = index
    }, [index])
    const [dx, setDx] = useState(0)
    const [dragging, setDragging] = useState(false)
    const [exit, setExit] = useState<null | 'left' | 'right'>(null)
    // The card that just flew off: placed at the back with no transition, then
    // faded in next frame — otherwise it would visibly sweep back across
    const [tucking, setTucking] = useState<string | null>(null)
    const deckRef = useRef<HTMLDivElement>(null)
    const pausedUntilRef = useRef(0)
    const busyRef = useRef(false)
    const swipedRef = useRef(false)

    // New set of entries (refetch) → start from the top (reset during render,
    // React's "adjust state when a prop changes" pattern)
    const idsKey = entries.map((e) => e.id).join(',')
    const [seenIds, setSeenIds] = useState(idsKey)
    if (seenIds !== idsKey) {
        setSeenIds(idsKey)
        setIndex(0)
    }

    const advance = useCallback(
        (dir: 'left' | 'right') => {
            if (count < 2 || busyRef.current) return
            busyRef.current = true
            setExit(dir)
            window.setTimeout(() => {
                const cur = indexRef.current % count
                setTucking(entries[cur]?.id ?? null)
                setIndex((cur + (dir === 'left' ? 1 : count - 1)) % count)
                setExit(null)
                setDx(0)
                busyRef.current = false
            }, EXIT_MS)
        },
        [count, entries]
    )
    // Latest advance for the timer and touch listeners, which outlive renders
    const advanceRef = useRef(advance)
    useEffect(() => {
        advanceRef.current = advance
    }, [advance])

    useEffect(() => {
        if (tucking === null) return
        let raf2 = 0
        const raf1 = requestAnimationFrame(() => {
            raf2 = requestAnimationFrame(() => setTucking(null))
        })
        return () => {
            cancelAnimationFrame(raf1)
            cancelAnimationFrame(raf2)
        }
    }, [tucking])

    // Auto-advance; skips ticks while hidden, touched, or just swiped
    useEffect(() => {
        if (!autoAdvance || count < 2 || prefersReducedMotion()) return
        const timer = window.setInterval(() => {
            if (document.hidden || Date.now() < pausedUntilRef.current) return
            advanceRef.current('left')
        }, CYCLE_MS)
        return () => window.clearInterval(timer)
    }, [autoAdvance, count])

    // Horizontal swipe (native listeners: preventDefault needs passive: false)
    useEffect(() => {
        const el = deckRef.current
        if (!el) return
        let startX = 0
        let startY = 0
        let horizontal: boolean | null = null
        let last = 0

        const onStart = (e: TouchEvent) => {
            startX = e.touches[0].clientX
            startY = e.touches[0].clientY
            horizontal = null
            last = 0
            swipedRef.current = false
            pausedUntilRef.current = Infinity
        }
        const onMove = (e: TouchEvent) => {
            if (e.defaultPrevented) return // a descendant owns this gesture
            const mx = e.touches[0].clientX - startX
            const my = e.touches[0].clientY - startY
            if (horizontal === null) {
                if (Math.abs(mx) > 5 || Math.abs(my) > 5) horizontal = Math.abs(mx) > Math.abs(my)
                return
            }
            if (!horizontal) return
            if (e.cancelable) e.preventDefault()
            swipedRef.current = true
            last = mx
            setDragging(true)
            // One card: nowhere to go, so rubber-band
            setDx(count < 2 ? mx * 0.2 : mx)
        }
        const onEnd = () => {
            pausedUntilRef.current = Date.now() + RESUME_MS
            if (!horizontal) return
            horizontal = null
            setDragging(false)
            if (count > 1 && Math.abs(last) >= SWIPE_THRESHOLD) {
                navigator.vibrate?.(8)
                advanceRef.current(last < 0 ? 'left' : 'right')
            } else {
                setDx(0)
            }
        }

        el.addEventListener('touchstart', onStart, { passive: true })
        el.addEventListener('touchmove', onMove, { passive: false })
        el.addEventListener('touchend', onEnd, { passive: true })
        el.addEventListener('touchcancel', onEnd, { passive: true })
        return () => {
            el.removeEventListener('touchstart', onStart)
            el.removeEventListener('touchmove', onMove)
            el.removeEventListener('touchend', onEnd)
            el.removeEventListener('touchcancel', onEnd)
        }
    }, [count])

    if (count === 0) return null
    const depthCount = Math.min(count, 3)
    const front = index % count

    return (
        <Box>
            <Box
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: 0.75,
                    paddingX: 0.25,
                }}>
                <Typography
                    sx={{
                        fontSize: 11,
                        fontWeight: 700,
                        letterSpacing: '0.08em',
                        textTransform: 'uppercase',
                        color: colors.primaryBrown,
                    }}>
                    Latest
                </Typography>
                {count > 1 && (
                    <Box sx={{ display: 'flex', gap: '4px' }} aria-hidden="true">
                        {entries.map((e, i) => (
                            <Box
                                key={e.id}
                                sx={{
                                    width: 6,
                                    height: 6,
                                    borderRadius: '50%',
                                    border: `1px solid ${colors.primaryBrown}`,
                                    backgroundColor: i === front ? colors.primaryBrown : 'transparent',
                                    transition: 'background-color 0.2s',
                                }}
                            />
                        ))}
                    </Box>
                )}
            </Box>
            <Box
                ref={deckRef}
                role="region"
                aria-roledescription="carousel"
                aria-label="Latest trip activity"
                onClickCapture={(e) => {
                    // The tap that ended a swipe isn't a click
                    if (swipedRef.current) {
                        e.preventDefault()
                        e.stopPropagation()
                        swipedRef.current = false
                    }
                }}
                sx={{
                    position: 'relative',
                    height: CARD_H + (depthCount - 1) * STACK_STEP + 2,
                    // Stacked cards shrink, so the deck never pokes past the page
                    marginRight: '2px',
                    touchAction: 'pan-y',
                }}>
                {entries.map((entry, i) => {
                    const depth = (i - front + count) % count
                    if (depth >= depthCount) return null
                    const isFront = depth === 0
                    let transform: string
                    if (isFront && exit) {
                        const sign = exit === 'left' ? -1 : 1
                        transform = `translateX(${sign * 120}%) rotate(${sign * 7}deg)`
                    } else if (isFront) {
                        transform = `translateX(${dx}px) rotate(${dx / 24}deg)`
                    } else {
                        transform = `translateY(${depth * STACK_STEP}px) scale(${1 - depth * 0.04})`
                    }
                    const isTucking = tucking === entry.id
                    return (
                        <Box
                            key={entry.id}
                            sx={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                right: 0,
                                zIndex: 10 - depth,
                                transform,
                                transformOrigin: '50% 100%',
                                opacity: (isFront && exit) || isTucking ? 0 : 1,
                                transition:
                                    (isFront && dragging) || isTucking
                                        ? 'none'
                                        : `transform ${EXIT_MS}ms cubic-bezier(.2,.7,.3,1), opacity ${EXIT_MS}ms`,
                                pointerEvents: isFront ? 'auto' : 'none',
                            }}>
                            <DeckCard entry={entry} now={now} interactive={isFront} />
                        </Box>
                    )
                })}
            </Box>
        </Box>
    )
}
