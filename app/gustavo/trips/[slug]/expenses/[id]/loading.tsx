'use client'

import { PageLoadingSkeleton } from 'components/page-loading-skeleton'

// Instant navigation boundary for opening an expense. The detail reads from
// already-loaded trip context, so this only covers the brief route transition —
// enough to keep the tap from feeling dead.
export default function Loading() {
    return <PageLoadingSkeleton cards={3} />
}
