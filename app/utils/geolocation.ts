/**
 * Device position for biasing place search. Never throws — every failure
 * (denied, timeout, unsupported) resolves to null so callers just fall back.
 */

export type Coords = { lat: number; lng: number }

// A fix stays good enough for search ranking for a few minutes, and asking
// the GPS again on every form open would slow the first search down.
const MAX_AGE_MS = 5 * 60 * 1000

let cached: { coords: Coords; at: number } | null = null
let inflight: Promise<Coords | null> | null = null

const supported = () =>
    typeof navigator !== 'undefined' && 'geolocation' in navigator

export const getCachedCoords = (): Coords | null =>
    cached && Date.now() - cached.at < MAX_AGE_MS ? cached.coords : null

/** True only when access was already granted, so reading the position
 *  can't pop a permission prompt. */
export const isGeolocationGranted = async (): Promise<boolean> => {
    if (!supported()) return false
    try {
        const status = await navigator.permissions.query({ name: 'geolocation' })
        return status.state === 'granted'
    } catch {
        return false
    }
}

/** Resolve the device position, prompting for permission the first time.
 *  Once denied, the browser rejects immediately without re-prompting. */
export const requestCoords = (): Promise<Coords | null> => {
    const hit = getCachedCoords()
    if (hit) return Promise.resolve(hit)
    if (inflight) return inflight
    if (!supported()) return Promise.resolve(null)

    inflight = new Promise<Coords | null>((resolve) => {
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const coords = {
                    lat: pos.coords.latitude,
                    lng: pos.coords.longitude,
                }
                cached = { coords, at: Date.now() }
                resolve(coords)
            },
            () => resolve(null),
            // Coarse is plenty for a 10 km bias, and much faster to acquire.
            // The timeout only starts once permission is granted.
            { enableHighAccuracy: false, maximumAge: MAX_AGE_MS, timeout: 10_000 }
        )
    }).finally(() => {
        inflight = null
    })
    return inflight
}
