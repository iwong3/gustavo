'use client'

import { ReceiptsListSkeleton } from 'components/receipts/receipts-list-skeleton'

// Instant navigation boundary for entering a trip (its expenses list). Shows on
// tap while the route payload + trip data load, so going into a trip isn't a
// dead click. The trip layout's own loading state reuses the same skeleton.
export default function Loading() {
    return <ReceiptsListSkeleton />
}
