'use client'

import { Box } from '@mui/material'
import { useRouter } from 'next/navigation'
import { useEffect, useRef } from 'react'

/**
 * Prefetches `href` once the wrapped element scrolls into view — the same thing
 * next/link does natively for real <Link>s.
 *
 * Use it for tap targets that navigate via `router.push` (swipeable rows and
 * other custom gesture handlers), which get no prefetching otherwise. Without a
 * warm route, tapping pays a full RSC round-trip before anything can paint —
 * including the route's own loading.tsx, which lives on the far side of that
 * request — so the tap reads as a freeze rather than an instant placeholder.
 *
 * Prefetches once per href, then stops observing.
 */
export function PrefetchOnVisible({
    href,
    children,
}: {
    href: string
    children: React.ReactNode
}) {
    const router = useRouter()
    const ref = useRef<HTMLDivElement | null>(null)
    const prefetched = useRef(false)

    useEffect(() => {
        prefetched.current = false
        const el = ref.current
        if (!el) return

        const observer = new IntersectionObserver(
            (entries) => {
                if (prefetched.current) return
                if (!entries.some((e) => e.isIntersecting)) return
                prefetched.current = true
                router.prefetch(href)
                observer.disconnect()
            },
            // Warm slightly before the row is actually on screen, like Link does
            { rootMargin: '200px' }
        )
        observer.observe(el)
        return () => observer.disconnect()
    }, [href, router])

    return <Box ref={ref}>{children}</Box>
}
