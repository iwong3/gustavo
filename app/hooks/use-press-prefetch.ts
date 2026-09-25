'use client'

import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useRef } from 'react'

/**
 * Route warming for a list whose rows navigate via `router.push`. Replaces a
 * `PrefetchOnVisible` per row, which fired a server request for every row
 * scrolled past (~10/s while scrolling).
 *
 * - Once per mount, the first row's route: loads the detail page's code,
 *   which every row shares.
 * - On press, the pressed row's route: pointerdown lands ~100ms before the
 *   tap's click, which is usually enough for the request to finish first.
 *
 * Spread the returned handler on the list container and give each row a
 * `data-href`.
 */
export function usePressPrefetch(firstHref: string | undefined) {
    const router = useRouter()
    const warmed = useRef(false)

    useEffect(() => {
        if (warmed.current || !firstHref) return
        warmed.current = true
        router.prefetch(firstHref)
    }, [firstHref, router])

    return useCallback(
        (e: React.PointerEvent) => {
            const href = (e.target as Element).closest<HTMLElement>('[data-href]')?.dataset.href
            if (href) router.prefetch(href)
        },
        [router]
    )
}
