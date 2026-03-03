import { UrlsByTrip, ViewPath } from 'utils/data-mapping'
import { Trip } from 'utils/trips'
// import GoogleDocLogo from '../images/google-docs.png'
// import GoogleFormLogo from '../images/google-forms.png'
// import GoogleMapLogo from '../images/google-maps.png'
// import GoogleSheetLogo from '../images/google-sheets.png'

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
            return '' // GoogleDocLogo
        case LinkType.GoogleForm:
            return '' // GoogleFormLogo
        case LinkType.GoogleMap:
            return '' // GoogleMapLogo
        case LinkType.GoogleSheet:
            return '' // GoogleSheetLogo
    }
}

export const LinksByTrip: Map<Trip, Link[]> = new Map([
    [
        Trip.Japan2024,
        [
            {
                name: 'Itinerary',
                url: UrlsByTrip.get(Trip.Japan2024)!.ItineraryUrl!,
                personal: true,
                type: LinkType.GoogleDoc,
            },
            {
                name: 'Google Maps List',
                url: UrlsByTrip.get(Trip.Japan2024)!.GoogleMapsListUrl!,
                personal: true,
                type: LinkType.GoogleMap,
            },
            {
                name: 'Submit Receipts',
                url: UrlsByTrip.get(Trip.Japan2024)!.GoogleFormUrl,
                personal: true,
                type: LinkType.GoogleForm,
            },
            {
                name: 'Spend Data',
                url: UrlsByTrip.get(Trip.Japan2024)!.GoogleSheetUrl + ViewPath,
                personal: true,
                type: LinkType.GoogleSheet,
            },
            {
                name: 'Kyoto Foliage Tracker',
                url: 'https://souda-kyoto.jp/guide/season/koyo/',
                personal: false,
            },
        ],
    ],
    [
        Trip.Vancouver2024,
        [
            {
                name: 'Submit Receipt',
                url: UrlsByTrip.get(Trip.Vancouver2024)!.GoogleFormUrl,
                personal: true,
                type: LinkType.GoogleForm,
            },
            {
                name: 'Spend Data',
                url:
                    UrlsByTrip.get(Trip.Vancouver2024)!.GoogleSheetUrl +
                    ViewPath,
                personal: true,
                type: LinkType.GoogleSheet,
            },
        ],
    ],
    [
        Trip.SouthKorea2025,
        [
            {
                name: 'Submit Receipt',
                url: UrlsByTrip.get(Trip.SouthKorea2025)!.GoogleFormUrl,
                personal: true,
                type: LinkType.GoogleForm,
            },
            {
                name: 'Spend Data',
                url:
                    UrlsByTrip.get(Trip.SouthKorea2025)!.GoogleSheetUrl +
                    ViewPath,
                personal: true,
                type: LinkType.GoogleSheet,
            },
        ],
    ],
    [
        Trip.Japan2025,
        [
            {
                name: 'Itinerary',
                url: UrlsByTrip.get(Trip.Japan2025)!.ItineraryUrl!,
                personal: true,
                type: LinkType.GoogleDoc,
            },
            {
                name: 'Google Maps List',
                url: UrlsByTrip.get(Trip.Japan2025)!.GoogleMapsListUrl!,
                personal: true,
                type: LinkType.GoogleMap,
            },
            {
                name: 'Submit Receipts',
                url: UrlsByTrip.get(Trip.Japan2025)!.GoogleFormUrl,
                personal: true,
                type: LinkType.GoogleForm,
            },
            {
                name: 'Spend Data',
                url: UrlsByTrip.get(Trip.Japan2025)!.GoogleSheetUrl + ViewPath,
                personal: true,
                type: LinkType.GoogleSheet,
            },
        ],
    ],
])
