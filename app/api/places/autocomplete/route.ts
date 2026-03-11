import { NextRequest, NextResponse } from 'next/server'
import { requireAuthWithUserId } from '@/lib/api-helpers'

const GOOGLE_API_KEY = process.env.GOOGLE_MAPS_API_KEY

export async function POST(request: NextRequest) {
    const authUser = await requireAuthWithUserId()
    if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    if (!GOOGLE_API_KEY) {
        return NextResponse.json({ error: 'Google Maps API key not configured' }, { status: 500 })
    }

    const body = await request.json()
    const { query, sessionToken } = body as { query?: string; sessionToken?: string }

    if (!query || query.trim().length === 0) {
        return NextResponse.json({ predictions: [] })
    }

    const response = await fetch('https://places.googleapis.com/v1/places:autocomplete', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': GOOGLE_API_KEY,
        },
        body: JSON.stringify({
            input: query.trim(),
            ...(sessionToken ? { sessionToken } : {}),
        }),
    })

    if (!response.ok) {
        const error = await response.text()
        console.error('Google Places Autocomplete error:', error)
        return NextResponse.json({ error: 'Places API error' }, { status: 502 })
    }

    const data = await response.json()

    const predictions = (data.suggestions || [])
        .filter((s: Record<string, unknown>) => s.placePrediction)
        .map((s: { placePrediction: { placeId: string; text: { text: string }; structuredFormat: { mainText: { text: string }; secondaryText?: { text: string } } } }) => ({
            placeId: s.placePrediction.placeId,
            name: s.placePrediction.structuredFormat.mainText.text,
            address: s.placePrediction.structuredFormat.secondaryText?.text || s.placePrediction.text.text,
        }))

    return NextResponse.json({ predictions })
}
