'use client'

/**
 * HomeLayout — the home page's frame: the greeting (big Gus + the day's
 * Breaking Bad quote) above the content sections.
 *
 * When the content needs the room — it plus the full greeting wouldn't fit in
 * the scroll area (#main-scroll) — the greeting collapses away and the header
 * shows a small Gus + the quote instead (app-shell reads useHomeHeaderStore).
 * On a light day it stays as the big hero. The measurement uses the
 * greeting's natural height even while collapsed, so collapsing it can't flip
 * the decision back (no flicker loop), and re-runs whenever the content or the
 * screen changes size — sections pop in as their data lands.
 */
import { Box } from '@mui/material'
import { type ReactNode, useEffect, useLayoutEffect, useRef, useState } from 'react'

import { colors } from '@/lib/colors'
import { useHomeHeaderStore } from './home-header-store'
import { HeroQuote } from './home-quote'

/** Space above the content (kept when the greeting collapses). */
const TOP_PAD = 8
/** Clearance so the last card doesn't crowd the tab bar. */
const BOTTOM_PAD = 32
/** The app shell's scroll area — what "fits on screen" is measured against. */
const SCROLLER_ID = 'main-scroll'

// Measure before paint on the client; plain effect during the static prerender
const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect

export default function HomeLayout({ children }: { children: ReactNode }) {
    const heroRef = useRef<HTMLDivElement>(null)
    const bodyRef = useRef<HTMLDivElement>(null)
    const compact = useHomeHeaderStore((st) => st.compact)
    const setCompact = useHomeHeaderStore((st) => st.setCompact)
    // No collapse animation until the first measurement lands, so a cached
    // page opens already in the right state instead of animating into it
    const [measured, setMeasured] = useState(false)

    useIsomorphicLayoutEffect(() => {
        const scroller = document.getElementById(SCROLLER_ID)
        const hero = heroRef.current
        const body = bodyRef.current
        if (!scroller || !hero || !body) return
        const check = () => {
            const needed = TOP_PAD + hero.scrollHeight + body.offsetHeight + BOTTOM_PAD
            setCompact(needed > scroller.clientHeight + 1)
        }
        check()
        const raf = requestAnimationFrame(() => setMeasured(true))
        const observer = new ResizeObserver(check)
        observer.observe(scroller)
        observer.observe(body)
        return () => {
            cancelAnimationFrame(raf)
            observer.disconnect()
        }
    }, [setCompact])

    return (
        <Box
            sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                width: '100%',
                paddingX: 4,
                paddingTop: `${TOP_PAD}px`,
                paddingBottom: `${BOTTOM_PAD}px`,
            }}>
            {/* Greeting — the grid-row trick animates the collapse to the
                content's real height */}
            <Box
                aria-hidden={compact}
                sx={{
                    'display': 'grid',
                    'gridTemplateRows': compact ? '0fr' : '1fr',
                    'opacity': compact ? 0 : 1,
                    'width': '100%',
                    'transition': measured ? 'grid-template-rows 280ms ease, opacity 200ms ease' : 'none',
                    '@media (prefers-reduced-motion: reduce)': { transition: 'none' },
                }}>
                <Box
                    ref={heroRef}
                    sx={{
                        overflow: 'hidden',
                        minHeight: 0,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                    }}>
                    {/* Gus Fring avatar — app-shell morphs it into the header
                        corner. Top padding keeps the 3px outline unclipped. */}
                    <Box sx={{ paddingBottom: 1, paddingTop: '3px' }}>
                        <img
                            id="home-gus-avatar"
                            src="/gus-fring.png"
                            alt="Gustavo"
                            style={{
                                width: 96,
                                height: 96,
                                borderRadius: '100%',
                                objectFit: 'cover',
                                border: `4px solid ${colors.primaryWhite}`,
                                outline: `3px solid ${colors.primaryBlack}`,
                                boxShadow: `3px 4px 0px ${colors.primaryBlack}`,
                            }}
                        />
                    </Box>
                    <HeroQuote />
                </Box>
            </Box>

            <Box ref={bodyRef} sx={{ display: 'flex', flexDirection: 'column', gap: 2, width: '100%' }}>
                {children}
            </Box>
        </Box>
    )
}
