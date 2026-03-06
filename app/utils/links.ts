import { UrlsByTripSlug, ViewPath } from 'utils/data-mapping'

export type Link = {
    name: string
    url: string
    personal: boolean
    type?: LinkType
}

enum LinkType {
    GoogleDoc = 'Google Doc',
    GoogleForm = 'Google Form',
    GoogleMap = 'Google Map',
    GoogleSheet = 'Google Sheet',
}

export const getLogoFromLinkType = (type: LinkType) => {
    switch (type) {
        case LinkType.GoogleDoc:
            return ''
        case LinkType.GoogleForm:
            return ''
        case LinkType.GoogleMap:
            return ''
        case LinkType.GoogleSheet:
            return ''
    }
}

function buildTripLinks(slug: string): Link[] {
    const urls = UrlsByTripSlug[slug]
    if (!urls) return []

    const links: Link[] = []

    if (urls.ItineraryUrl) {
        links.push({
            name: 'Itinerary',
            url: urls.ItineraryUrl,
            personal: true,
            type: LinkType.GoogleDoc,
        })
    }

    if (urls.GoogleMapsListUrl) {
        links.push({
            name: 'Google Maps List',
            url: urls.GoogleMapsListUrl,
            personal: true,
            type: LinkType.GoogleMap,
        })
    }

    links.push({
        name: 'Submit Receipts',
        url: urls.GoogleFormUrl,
        personal: true,
        type: LinkType.GoogleForm,
    })

    links.push({
        name: 'Spend Data',
        url: urls.GoogleSheetUrl + ViewPath,
        personal: true,
        type: LinkType.GoogleSheet,
    })

    // Trip-specific external links
    if (slug === 'japan-2024') {
        links.push({
            name: 'Kyoto Foliage Tracker',
            url: 'https://souda-kyoto.jp/guide/season/koyo/',
            personal: false,
        })
    }

    return links
}

export const LinksByTripSlug: Record<string, Link[]> = {
    'japan-2024': buildTripLinks('japan-2024'),
    'vancouver-2024': buildTripLinks('vancouver-2024'),
    'south-korea-2025': buildTripLinks('south-korea-2025'),
    'japan-2025': buildTripLinks('japan-2025'),
}
