import { NextRequest, NextResponse } from 'next/server'
import { requireAuthWithUserId } from '@/lib/api-helpers'

const GOOGLE_API_KEY = process.env.GOOGLE_MAPS_API_KEY

const FIELD_MASK = 'id,displayName,formattedAddress,location,addressComponents,types,primaryType'

export async function GET(
    _request: NextRequest,
    { params }: { params: Promise<{ placeId: string }> }
) {
    const authUser = await requireAuthWithUserId()
    if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    if (!GOOGLE_API_KEY) {
        return NextResponse.json({ error: 'Google Maps API key not configured' }, { status: 500 })
    }

    const { placeId } = await params

    const response = await fetch(`https://places.googleapis.com/v1/places/${placeId}`, {
        headers: {
            'X-Goog-Api-Key': GOOGLE_API_KEY,
            'X-Goog-FieldMask': FIELD_MASK,
        },
    })

    if (!response.ok) {
        const error = await response.text()
        console.error('Google Places Details error:', error)
        return NextResponse.json({ error: 'Places API error' }, { status: 502 })
    }

    const data = await response.json()

    const addressComponents = (data.addressComponents || []).map(
        (c: { longText: string; shortText: string; types: string[] }) => ({
            longText: c.longText,
            shortText: c.shortText,
            types: c.types,
        })
    )

    return NextResponse.json({
        placeId: data.id,
        name: data.displayName?.text || '',
        address: data.formattedAddress || '',
        lat: data.location?.latitude || 0,
        lng: data.location?.longitude || 0,
        addressComponents,
        types: data.types || [],
        primaryType: data.primaryType || null,
    })
}
