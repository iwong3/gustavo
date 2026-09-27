import { NextRequest, NextResponse } from 'next/server'
import { requireAuthWithUserId } from '@/lib/api-helpers'

const GOOGLE_API_KEY = process.env.GOOGLE_MAPS_API_KEY

// Soft bias around the device — nearby places rank first, but anything
// farther away (tomorrow's hotel in the next city) still comes back.
const BIAS_RADIUS_M = 10_000

type Suggestion = {
    placePrediction?: {
        placeId: string
        text: { text: string }
        structuredFormat: {
            mainText: { text: string }
            secondaryText?: { text: string }
        }
        distanceMeters?: number
    }
}

export async function POST(request: NextRequest) {
    const authUser = await requireAuthWithUserId()
    if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    if (!GOOGLE_API_KEY) {
        return NextResponse.json({ error: 'Google Maps API key not configured' }, { status: 500 })
    }

    const body = await request.json()
    const { query, sessionToken, lat, lng, regionCode } = body as {
        query?: string
        sessionToken?: string
        lat?: number
        lng?: number
        regionCode?: string
    }

    if (!query || query.trim().length === 0) {
        return NextResponse.json({ predictions: [] })
    }

    // Device position when the user allowed location access; otherwise the
    // trip's country as a weaker, region-level bias.
    const hasOrigin =
        Number.isFinite(lat) && Number.isFinite(lng) &&
        Math.abs(lat!) <= 90 && Math.abs(lng!) <= 180
    const origin = hasOrigin ? { latitude: lat!, longitude: lng! } : null
    // Google takes a ccTLD here, which matches ISO 3166 except UK
    const region =
        typeof regionCode === 'string' && /^[a-z]{2}$/i.test(regionCode)
            ? regionCode.toLowerCase().replace(/^gb$/, 'uk')
            : null

    const response = await fetch('https://places.googleapis.com/v1/places:autocomplete', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': GOOGLE_API_KEY,
        },
        body: JSON.stringify({
            input: query.trim(),
            ...(sessionToken ? { sessionToken } : {}),
            ...(origin
                ? {
                      locationBias: { circle: { center: origin, radius: BIAS_RADIUS_M } },
                      // Makes Google return distanceMeters per prediction
                      origin,
                  }
                : {}),
            ...(region ? { regionCode: region } : {}),
        }),
    })

    if (!response.ok) {
        const error = await response.text()
        console.error('Google Places Autocomplete error:', error)
        return NextResponse.json({ error: 'Places API error' }, { status: 502 })
    }

    const data = await response.json()

    const predictions = ((data.suggestions || []) as Suggestion[])
        .flatMap((s) => (s.placePrediction ? [s.placePrediction] : []))
        .map((p) => ({
            placeId: p.placeId,
            name: p.structuredFormat.mainText.text,
            address: p.structuredFormat.secondaryText?.text || p.text.text,
            // Google omits distanceMeters when it's 0
            distanceMeters: origin ? (p.distanceMeters ?? 0) : null,
        }))

    return NextResponse.json({ predictions })
}
