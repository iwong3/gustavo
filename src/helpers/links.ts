import { UrlsByTrip, ViewPath } from 'helpers/data-mapping'
import { Trip } from 'helpers/trips'
import GoogleDocLogo from '../images/google-docs.png'
import GoogleFormLogo from '../images/google-forms.png'
import GoogleMapLogo from '../images/google-maps.png'
import GoogleSheetLogo from '../images/google-sheets.png'

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
            return GoogleDocLogo
        case LinkType.GoogleForm:
            return GoogleFormLogo
        case LinkType.GoogleMap:
            return GoogleMapLogo
        case LinkType.GoogleSheet:
            return GoogleSheetLogo
    }
}

export const LinksByTrip: Map<Trip, Link[]> = new Map([
    [
        Trip.Japan2024,
        [
            {
                name: 'Itinerary',
                url: 'https://docs.google.com/document/d/1iIY1KnyAPzlT0qmRseU8t8R58N7dUC_zzyyJ3bWafnI/edit?usp=sharing',
                personal: true,
                type: LinkType.GoogleDoc,
            },
            {
                name: 'List of Places',
                url: 'https://maps.app.goo.gl/v9AbZK6PaY2d7SVU9',
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
])
