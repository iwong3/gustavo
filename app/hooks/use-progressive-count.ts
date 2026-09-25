'use client'

import { startTransition, useEffect, useState } from 'react'

import { pendingRestoreY } from 'hooks/use-scroll-restoration'

// Conservative (short) row height, so the first pass never runs out of rows
// before the screen — or a back navigation's restored scroll spot — is full
const MIN_ROW_PX = 48

/**
 * How many of a long list's `total` rows to render right now. The first
 * render gets just enough to fill the screen — plus, on a back navigation,
 * everything above the scroll position being restored — and the rest follow
 * in an interruptible background render straight after the first paint. A
 * 150-row list then mounts in the time of ~20, so the page appears as soon
 * as it's tapped (or swiped back to) instead of after the whole list.
 *
 * Only the first mount is staged: once full, it stays full.
 */
export function useProgressiveCount(total: number, offsetPx = 0): number {
    const [limit, setLimit] = useState(() => {
        if (typeof window === 'undefined') return 12
        const px = pendingRestoreY() + window.innerHeight * 1.5 - offsetPx
        return Math.max(12, Math.ceil(px / MIN_ROW_PX))
    })
    const full = limit >= total

    useEffect(() => {
        if (full) return
        startTransition(() => setLimit(Infinity))
    }, [full])

    return Math.min(limit, total)
}
