import { NextRequest, NextResponse } from 'next/server'
import { requireAuthWithUserId } from '@/lib/api-helpers'

const GOOGLE_API_KEY = process.env.GOOGLE_MAPS_API_KEY

const FIELD_MASK = 'id,displayName,formattedAddress,location,addressComponents,types,primaryType,priceLevel,rating,regularOpeningHours,websiteUri,photos'

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

    // Google Places API (New) returns priceLevel as string enum — convert to integer
    const priceLevelMap: Record<string, number> = {
        'PRICE_LEVEL_FREE': 0,
        'PRICE_LEVEL_INEXPENSIVE': 1,
        'PRICE_LEVEL_MODERATE': 2,
        'PRICE_LEVEL_EXPENSIVE': 3,
        'PRICE_LEVEL_VERY_EXPENSIVE': 4,
    }
    const priceLevelInt = typeof data.priceLevel === 'string'
        ? (priceLevelMap[data.priceLevel] ?? null)
        : (data.priceLevel ?? null)

    const addressComponents = (data.addressComponents || []).map(
        (c: { longText: string; shortText: string; types: string[] }) => ({
            longText: c.longText,
            shortText: c.shortText,
            types: c.types,
        })
    )

    // Extract photo resource names (for Places Photos API)
    const photoRefs = (data.photos || [])
        .slice(0, 3) // Keep top 3 photos max
        .map((p: { name: string }) => p.name)
        .filter(Boolean)

    return NextResponse.json({
        placeId: data.id,
        name: data.displayName?.text || '',
        address: data.formattedAddress || '',
        lat: data.location?.latitude || 0,
        lng: data.location?.longitude || 0,
        addressComponents,
        types: data.types || [],
        primaryType: data.primaryType || null,
        priceLevel: priceLevelInt,
        rating: data.rating != null ? data.rating : null,
        website: data.websiteUri || null,
        hoursJson: data.regularOpeningHours || null,
        photoRefs: photoRefs.length > 0 ? photoRefs : null,
    })
}
