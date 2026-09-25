'use client'

import { HealthRouteSkeleton } from 'components/skeleton/health-skeletons'

// Instant on-tap placeholder while the route payload + data load. This
// boundary covers every /health/* route, so the skeleton is chosen from the
// URL (see HealthRouteSkeleton) — it matches the page being opened.
export default function Loading() {
    return <HealthRouteSkeleton />
}
