'use client'

import { PageLoadingSkeleton } from 'components/page-loading-skeleton'

// Instant navigation boundary for the health dashboard — a heavy page with many
// queries, so tapping "Health" shows structure immediately instead of a dead
// wait while the route payload + data load.
export default function Loading() {
    return <PageLoadingSkeleton cards={5} />
}
