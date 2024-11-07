import { UrlsByTrip, ViewPath } from 'helpers/data-mapping'
import { Trip } from 'helpers/trips'

export type Link = {
    name: string
    url: string
    personal: boolean
}

export const LinksByTrip: Map<Trip, Link[]> = new Map([
    [
        Trip.Japan2024,
        [
            {
                name: 'Submit Receipt (Google Form)',
                url: UrlsByTrip.get(Trip.Japan2024)!.GoogleFormUrl,
                personal: true,
            },
            {
                name: 'Itinerary (Google Doc)',
                url: 'https://docs.google.com/document/d/1iIY1KnyAPzlT0qmRseU8t8R58N7dUC_zzyyJ3bWafnI/edit?usp=sharing',
                personal: true,
            },
            {
                name: 'Spend Data (Google Sheet)',
                url: UrlsByTrip.get(Trip.Japan2024)!.GoogleSheetUrl + ViewPath,
                personal: true,
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
                name: 'Submit Receipt (Google Form)',
                url: UrlsByTrip.get(Trip.Vancouver2024)!.GoogleFormUrl,
                personal: true,
            },
            {
                name: 'Spend Data (Google Sheet)',
                url:
                    UrlsByTrip.get(Trip.Vancouver2024)!.GoogleSheetUrl +
                    ViewPath,
                personal: true,
            },
        ],
    ],
])
