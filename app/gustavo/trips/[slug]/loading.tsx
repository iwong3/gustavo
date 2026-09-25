'use client'

import { TripsRouteSkeleton } from 'components/skeleton/trip-skeletons'

// Instant on-tap placeholder while the route payload + data load. The
// boundary also covers nested routes, so the skeleton is chosen from the URL
// (see TripsRouteSkeleton) — it always matches the page being opened.
export default function Loading() {
    return <TripsRouteSkeleton />
}
