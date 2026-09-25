'use client'

import { Box } from '@mui/material'
import { useLayoutEffect, useRef, useState } from 'react'

/**
 * Eases its own height to whatever its content measures — e.g. a card
 * whose body swaps between views of different heights. Watches the content
 * with a ResizeObserver, so it follows any change (view switch, data
 * arriving, filters). Honours prefers-reduced-motion.
 */
export function AnimatedHeight({
    children,
    duration = 180,
}: {
    children: React.ReactNode
    duration?: number
}) {
    const innerRef = useRef<HTMLDivElement | null>(null)
    const [height, setHeight] = useState<number | 'auto'>('auto')

    useLayoutEffect(() => {
        const el = innerRef.current
        if (!el) return
        const measure = () => setHeight(el.getBoundingClientRect().height)
        measure()
        const ro = new ResizeObserver(measure)
        ro.observe(el)
        return () => ro.disconnect()
    }, [])

    return (
        <Box
            sx={{
                height,
                overflow: 'hidden',
                transition: `height ${duration}ms cubic-bezier(0.2, 0.9, 0.3, 1)`,
                '@media (prefers-reduced-motion: reduce)': { transition: 'none' },
            }}>
            <Box ref={innerRef}>{children}</Box>
        </Box>
    )
}
